const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const Order = require('../models/order');
const Review = require('../models/review');

const renderProfilePage = (req, res) => {
  res.render('profile/profile');
};

const renderUpdateProfilePage = (req, res) => {
  res.render('profile/updateProfile', { errors: [] });
};

const getProfile = async (req, res) => {
  const userId = req.user._id;
  const userType = req.user.userType;

  try {
    let userData;
    if (userType === 'restaurant') {
      userData = await Restaurant.findById(userId).lean();
      delete userData.isChecked;
    } else {
      userData = await User.findById(userId).lean();
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
      orders = await Order.find({ userId: req.user._id }).populate('dishes.dishId').populate('restaurantId');
    } else if (req.user?.userType === 'admin') {
      return res.status(403).json({ message: "Admins não têm histórico de encomendas." });
    } else {
      orders = await Order.find({ restaurantId: req.user._id }).populate('dishes.dishId').populate('userId');
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

    const updateFields = { ...req.body };

    if (req.file) {
      const imageField = userType === 'restaurant' ? 'logo' : 'profilePicture';
      const subfolder = userType === 'restaurant' ? 'logos' : 'profilePictures';
      updateFields[imageField] = `/uploads/${subfolder}/${req.file.filename}`;
    }

    const excluded = ['_id', '__v', 'email', 'username', 'password'];
    excluded.forEach(field => delete updateFields[field]);

    await Model.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true, runValidators: true }
    );

    res.redirect('/user/perfil');
  } catch (error) {
    console.error("Erro no updateProfile:", error);
    res.status(500).render('profile/updateProfile', {
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

    const now = new Date();
    const orderDate = new Date(order.orderDate);
    const minutesSinceOrder = (now - orderDate) / (1000 * 60);

    if (minutesSinceOrder > 5) {
      return res.status(400).json({ message: "O tempo para cancelar este pedido já passou." });
    }

    if (order.state !== 'pendente') {
      return res.status(400).json({ message: "O pedido já foi processado e não pode ser cancelado." });
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

    res.redirect('/user/perfil');
  } catch (error) {
    console.error('Erro ao enviar avaliação:', error);
    res.status(500).json({ message: "Erro ao enviar avaliação." });
  }
};

const renderReviewPage = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId).populate('restaurantId').populate('dishes.dishId').lean();

    if (!order) return res.status(404).render('errors/404', { message: "Pedido não encontrado." });

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).render('errors/403', { message: "Sem permissão para avaliar este pedido." });
    }

    const existingReview = await Review.findOne({ orderId });
    if (existingReview) {
      return res.redirect('/user/perfil');
    }

    res.render('profile/review', { order });
  } catch (error) {
    console.error('Erro ao carregar página de avaliação:', error);
    res.status(500).render('errors/500', { message: "Erro interno ao carregar avaliação." });
  }
};

module.exports = {
  renderProfilePage,
  renderUpdateProfilePage,
  getProfile,
  getOrderHistory,
  updateProfile,
  cancelOrder,
  submitReview,
  renderReviewPage
};