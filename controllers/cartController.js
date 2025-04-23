const Cart = require('../models/cart');
const Dish = require('../models/dish');

const addToCart = async (req, res) => {
  try {
    const userId = req.user?._id || req.session?.userId || req.cookies.userId;
    if (!userId) return res.status(401).send('Utilizador não autenticado.');

    const dishIds = Array.isArray(req.body.dishIds) ? req.body.dishIds : [req.body.dishIds];

    for (const dishId of dishIds) {
      const doseKey = `dose_${dishId}`;
      const selectedDose = req.body[doseKey];

      const dish = await Dish.findById(dishId);
      const doseInfo = dish?.pricePerDose?.find(p => p.dose === selectedDose);
      if (!doseInfo) continue;

      const newCartItem = new Cart({
        userId,
        dishID: dishId,
        addedDate: new Date(),
        price: doseInfo.price,
        dose: selectedDose
      });

      await newCartItem.save();
    }

    res.redirect('/cliente/cardapio');
  } catch (err) {
    console.error('Erro ao adicionar ao carrinho:', err);
    res.status(500).send('Erro ao adicionar ao carrinho.');
  }
};

module.exports = {
  addToCart
};