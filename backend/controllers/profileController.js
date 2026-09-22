const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const Order = require('../models/order');
const Review = require('../models/review');
const { wrapAll } = require('../utils/asyncHandler');
const { canCustomerCancel, isValidRestaurantTransition } = require('../services/orderRules');

/** Campos que cada tipo de conta pode alterar no próprio perfil (tudo o resto é ignorado). */
const EDITABLE_FIELDS = {
  customer: ['name', 'birthDate', 'phone', 'nif', 'address'],
  admin: ['name', 'birthDate', 'phone', 'nif', 'address'],
  restaurant: ['name', 'phone', 'foundedAt', 'address'],
};

const sameId = (a, b) => String(a) === String(b);

/**
 * Um restaurante avança o estado de uma das SUAS encomendas (pendente → em preparação →
 * expedida → entregue). Antes, qualquer utilizador autenticado podia pôr qualquer encomenda
 * em qualquer estado.
 */
const updateOrderState = async (req, res) => {
  const { id } = req.params;
  const { state } = req.body;

  const order = await Order.findById(id);
  if (!order) {
    return res.status(404).json({ message: 'Encomenda não encontrada.' });
  }

  const isOwner = req.user.userType === 'restaurant' && sameId(order.restaurantId, req.user._id);
  if (!isOwner && req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Só o restaurante da encomenda pode alterar o seu estado.' });
  }
  if (!isValidRestaurantTransition(order.state, state)) {
    return res.status(400).json({ message: `Não é possível passar de "${order.state}" para "${state}".` });
  }

  order.state = state;
  await order.save();
  res.json({ message: 'Estado da encomenda atualizado com sucesso.', order });
};

const getProfile = async (req, res) => {
  const userId = req.user._id;
  const userType = req.user.userType;

  try {
    let userData;
    if (userType === 'restaurant') {
      userData = await Restaurant.findById(userId).lean();
      delete userData.isChecked;
      userData.userType = 'restaurant';
    } else if (userType === 'admin') {
      userData = await User.findById(userId).lean();
      delete userData.isChecked;
      userData.userType = 'admin';
    } else if (userType === 'customer') {
      userData = await User.findById(userId).lean();
      if (userData) {
        userData.userType = 'customer';
      }
    }

    if (!userData) return res.status(404).json({ message: 'Utilizador não encontrado.' });

    res.json(userData);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao carregar perfil', error: error.message });
  }
};

const getOrderHistory = async (req, res) => {
  try {
    let orders;

    if (req.user?.userType === 'customer') {
      orders = await Order.find({ userId: req.user._id }).populate('dishes.dishId').populate('restaurantId', 'name phone address logo');
    } else if (req.user?.userType === 'admin') {
      return res.status(403).json({ message: "Admins não têm histórico de encomendas." });
    } else {
      orders = await Order.find({ restaurantId: req.user._id }).populate('dishes.dishId').populate('userId', 'name username phone address');
    } 

    res.json(orders);
  } catch (err) {
    console.error('Erro ao carregar encomendas:', err);
    res.status(500).json({ message: "Erro ao carregar histórico de encomendas." });
  }
};

const updateProfile = async (req, res) => {
  const userType = req.user.userType;
  const userId = req.user._id;

  try {
    const Model = userType === 'restaurant' ? Restaurant : User;

    // Só se copiam campos permitidos: antes era possível enviar "userType": "admin" ou
    // "isChecked": true e ganhar privilégios.
    const allowed = EDITABLE_FIELDS[userType] || [];
    const updateFields = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updateFields[field] = req.body[field];
    });

    if (req.file) {
      const imageField = userType === 'restaurant' ? 'logo' : 'profilePicture';
      const subfolder = userType === 'restaurant' ? 'logos' : 'profilePictures';
      updateFields[imageField] = `/uploads/${subfolder}/${req.file.filename}`;
    }

    await Model.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true, runValidators: true }
    );

    res.status(200).json({ message: 'Perfil atualizado com sucesso.' });
  } catch (error) {
    console.error("Erro no updateProfile:", error);
    res.status(500).json({
      errors: [{ msg: 'Erro ao atualizar perfil: ' + error.message }]
    });
  }
};

const cancelOrder = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Pedido não encontrado." });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Não tens permissão para cancelar este pedido." });
    }

    const decision = canCustomerCancel(order);
    if (!decision.allowed) {
      return res.status(400).json({ message: decision.reason });
    }

    order.state = 'cancelada';
    await order.save();

    res.json({ message: "Pedido cancelado com sucesso." });
  } catch (error) {
    console.error('Erro ao cancelar pedido:', error);
    res.status(500).json({ message: "Erro ao cancelar pedido." });
  }
};

const submitReview = async (req, res) => {
  const { orderId } = req.params;
  const { title, description } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Pedido não encontrado." });

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Sem permissão para avaliar este pedido." });
    }

    if (order.state !== 'entregue') {
      return res.status(400).json({ message: "Só é possível avaliar encomendas já entregues." });
    }

    const existingReview = await Review.findOne({ orderId });
    if (existingReview) {
      return res.status(400).json({ message: "Já enviaste avaliação para esta encomenda." });
    }

    const reviewData = {
      title,
      description,
      userId: req.user._id,
      restaurantId: order.restaurantId,
      orderId: order._id,
    };

    if (req.file) {
      reviewData.image = `/uploads/reviews/${req.file.filename}`;
    }

    const review = new Review(reviewData);
    await review.save();

    order.reviewed = true;
    await order.save();

    res.status(201).json({
      message: "Avaliação enviada com sucesso.",
      redirectTo: "/user/perfil"
    });
  } catch (error) {
    console.error('Erro ao enviar avaliação:', error);
    res.status(500).json({ message: "Erro ao enviar avaliação." });
  }
};

const renderReviewPage = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId)
      .populate('restaurantId', 'name logo')
      .populate('dishes.dishId')
      .lean();

    if (!order) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Sem permissão para avaliar este pedido." });
    }

    const existingReview = await Review.findOne({ orderId });
    if (existingReview) {
      return res.status(302).json({ redirect: '/user/perfil' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Erro ao carregar página de avaliação:', error);
    res.status(500).json({ error: "Erro interno ao carregar avaliação." });
  }
};

const loadOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('dishes.dishId')
      .populate('restaurantId', 'name phone address logo');
    const canSee = order && (sameId(order.userId, req.user._id) || req.user.userType === 'admin');
    if (!canSee) return res.status(404).json({ message: 'Encomenda não encontrada.' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar encomenda.' });
  }
};

module.exports = wrapAll({
  updateOrderState,
  getProfile,
  getOrderHistory,
  updateProfile,
  cancelOrder,
  submitReview,
  renderReviewPage,
  loadOrderDetails
});
