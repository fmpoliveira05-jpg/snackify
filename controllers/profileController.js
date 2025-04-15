const User = require('../models/user');
const Restaurant = require('../models/restaurant');

const renderProfilePage = (req, res) => {
  res.render('navbar/profile');
};

const getProfile = async (req, res) => {
  const userId = req.user._id;
  const userType = req.user.userType;

  try {
    let userData;
    if (userType === 'restaurant') {
      userData = await Restaurant.findById(userId).lean();
    } else {
      userData = await User.findById(userId).lean();
    }

    if (!userData) return res.status(404).json({ message: 'Utilizador não encontrado.' });

    res.json(userData);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao carregar perfil', error: error.message });
  }
};

const updateProfile = async (req, res) => {
  const { name, address, phone, profilePicture } = req.body;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { name, address, phone, profilePicture },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ message: 'Perfil atualizado com sucesso!', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar perfil', error: error.message });
  }
};

module.exports = {
  renderProfilePage,
  getProfile,
  updateProfile
};