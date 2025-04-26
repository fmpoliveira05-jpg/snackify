const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Cart = require('../models/cart');
const Dish = require('../models/dish');
const Order = require('../models/order');

const viewCart = async (req, res) => {
    const userId = req.user._id;
    let cart = await Cart.findOne({ userId }).populate('items.dishId');

    if (!cart) {
        cart = new Cart({ userId });
        await cart.save();
    }

    const isExpired = cart.timeout && new Date() > cart.timeout;
    if (isExpired) {
        cart.items = [];
        cart.total = 0;
        cart.timeout = null;
        await cart.save();
    }

    res.render('cart/viewCart', { cart });
};

const addToCart = async (req, res) => {
    const { dishId, amount, dose } = req.body;

    const userId = req.user._id;

    const parsedAmount = parseInt(amount, 10);
    if (!parsedAmount || parsedAmount < 1) {
        return res.redirect('/menu');
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) cart = new Cart({ userId });

    const existingItem = cart.items.find(item =>
        item.dishId.equals(dishId) && item.dose === dose
    );

    if (existingItem) {
        existingItem.amount += parsedAmount;
    } else {
        cart.items.push({ dishId, amount: parsedAmount, dose});
    }

    const dish = await Dish.findById(dishId);
    const priceEntry = dish.pricePerDose.find(p => p.dose === dose);

    if (!priceEntry) {
        return res.redirect('/menu');
    }

    const itemTotal = priceEntry.price * parsedAmount;
    cart.total += itemTotal;

    if (!cart.timeout) {
        cart.timeout = new Date(Date.now() + 10 * 60 * 1000);
    }

    await cart.save();
    res.redirect('/carrinho');
};

const removeFromCart = async (req, res) => {
    const { dishId, dose } = req.body;
    const userId = req.user._id;

    let cart = await Cart.findOne({ userId }).populate('items.dishId');
    if (!cart) return res.redirect('/carrinho');

    const index = cart.items.findIndex(item =>
        item.dishId._id.equals(dishId) && item.dose === dose
    );

    if (index !== -1) {
      const item = cart.items[index];
      const priceInfo = item.dishId.pricePerDose.find(p => p.dose === item.dose);
      if (priceInfo) {
        cart.total -= priceInfo.price * item.amount;
      }
      cart.items.splice(index, 1);
    
      if (cart.items.length === 0) {
        cart.total = 0;
        cart.timeout = null;
      }
    }    

    await cart.save();
    res.redirect('/carrinho');
};

const checkout = async (req, res) => {
    const orderId = req.query.orderId;
  
    try {
      const order = await Order.findById(orderId).populate('dishes.dishId');
      if (!order) return res.status(404).send("Encomenda não encontrada.");
  
      res.render('cart/checkout', { order });
    } catch (err) {
      console.error("Erro no checkout:", err);
      res.status(500).send("Erro ao processar o checkout.");
    }
  };

const createOrderFromCart = async (req, res) => {
    const userId = req.user._id;
  
    try {
      const cart = await Cart.findOne({ userId }).populate('items.dishId');
      if (!cart || cart.items.length === 0) {
        return res.redirect('/carrinho');
      }

      const uniqueRestaurants = new Set(cart.items.map(item => item.dishId.restaurantId.toString()));
      if (uniqueRestaurants.size > 1) {
        return res.status(400).send("Todos os pratos da encomenda devem ser do mesmo restaurante.");
      }
  
      const restaurantId = cart.items[0].dishId.restaurantId;
  
      const order = new Order({
        userId,
        restaurantId,
        dishes: cart.items.map(item => ({
          dishId: item.dishId._id,
          amount: item.amount,
          dose: item.dose
        })),
        state: "pendente",
        orderDate: new Date(),
        cancelTimeout: new Date(Date.now() + 5 * 60 * 1000),
        orderCode: `ORD-${Date.now().toString(36).toUpperCase()}`
      });
  
      await order.save();
  
      cart.items = [];
      cart.total = 0;
      cart.timeout = null;
      await cart.save();
  
      res.redirect(`/carrinho/checkout?orderId=${order._id}`);
    } catch (err) {
      console.error("Erro ao criar encomenda:", err);
      res.status(500).send("Erro ao criar a encomenda.");
    }
};

const createStripeSession = async (req, res) => {
  try {
    console.log(req.body);
    const { orderId, orderCode, dishes } = req.body;

    const line_items = dishes.map(item => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.dishId.name,
        },
        unit_amount: item.dishId.pricePerDose.find(p => p.dose === item.dose).price * 100,
      },
      quantity: item.amount,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${req.headers.origin}/carrinho/pagamento-sucesso?orderId=${orderId}`,
      cancel_url: `${req.headers.origin}/carrinho/checkout?orderId=${orderId}`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Erro a criar sessão Stripe:", err);
    res.status(500).json({ error: "Erro ao criar sessão de pagamento." });
  }
};

const handlePaymentSuccess = async (req, res) => {
  const { orderId } = req.query;

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).send("Encomenda não encontrada.");

    order.state = 'concluída';
    await order.save();

    res.redirect(`/carrinho/checkout?orderId=${order._id}`);
  } catch (err) {
    console.error("Erro ao finalizar pagamento:", err);
    res.status(500).send("Erro ao concluir o pagamento.");
  }
};

module.exports = {
    viewCart,
    addToCart,
    removeFromCart,
    checkout,
    createOrderFromCart,
    createStripeSession,
    handlePaymentSuccess
};