const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const Order = require('../models/order');

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

module.exports = {
  renderProfilePage,
  renderUpdateProfilePage,
  getProfile,
  getOrderHistory,
  updateProfile
};