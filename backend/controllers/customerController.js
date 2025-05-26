const Restaurant = require('../models/restaurant');
const Dish = require('../models/dish');
const Menu = require('../models/menu');
const Order = require('../models/order');
const Cart = require('../models/cart');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const listRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    res.json(restaurants);
  } catch (err) {
    res.status(500).send('Erro ao carregar os restaurantes.');
  }
};

const readRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).send('Restaurante não encontrado.');
    res.json(restaurant);
  } catch (err) {
    console.error('Erro ao carregar restaurante:', err);
    res.status(500).send('Erro ao carregar restaurante.');
  }
};

const readMenu = async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);
    if (!menu) {
      return res.status(404).json({ message: 'Menu não encontrado' });
    }
    res.json(menu);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao carregar menu', error });
  }
};

const listMenus = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).send('Restaurante não encontrado.');

    const menus = await Menu.find({ restaurantId: restaurant._id });

    const menusComPratos = await Promise.all(menus.map(async menu => {
      const pratos = await Dish.find({ menuId: menu._id });
      return { ...menu.toObject(), dishes: pratos };
    }));

    res.json(menusComPratos);
  } catch (err) {
    console.error('Erro ao carregar os menus:', err);
    res.status(500).send('Erro ao carregar os menus.');
  }
};

const listDishes = async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);
    if (!menu) return res.status(404).send('Menu não encontrado.');

    const dishes = await Dish.find({ menuId: menu._id });

    res.json(dishes);
  } catch (err) {
    console.error('Erro ao carregar os pratos:', err);
    res.status(500).send('Erro ao carregar os pratos.');
  }
};

const showCustomerDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    const orders = await Order.find({ userId })
      .sort({ orderDate: -1 })
      .limit(5)
      .populate('dishes.dishId');

    const orderTotals = orders.map(order => {
      let total = 0;

      order.dishes.forEach(item => {
        const dish = item.dishId;
        const dosePrice = dish.pricePerDose.find(p => p.dose === item.dose);
        if (dosePrice) {
          total += dosePrice.price * item.amount;
        }
      });

      return {
        orderCode: order.orderCode || order._id.toString().slice(-5),
        total: total
      };
    });

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const cancelledOrders = await Order.find({
      userId,
      state: 'cancelada',
      orderDate: { $gte: oneMonthAgo }
    }).sort({ orderDate: 1 });

    let blockedUntil = null;

    if (cancelledOrders.length >= 5) {
      const fifthCancelDate = cancelledOrders[4].orderDate;
      blockedUntil = new Date(fifthCancelDate);
      blockedUntil.setMonth(blockedUntil.getMonth() + 2);
    }

    res.json({
      orderTotals,
      isBlocked: !!blockedUntil,
      blockedUntil: blockedUntil ? blockedUntil.toLocaleDateString('pt-PT') : null
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao carregar dados das encomendas.' });
  }
};

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

    res.json(cart);
};

const addToCart = async (req, res) => {
    const { dishId, amount, dose } = req.body;

    const userId = req.user._id;

    const parsedAmount = parseInt(amount, 10);
    if (!parsedAmount || parsedAmount < 1) {
        return res.status(400).json({ message: 'Quantidade inválida.' });
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
        return res.status(400).json({ message: 'Dose inválida.' });
    }

    const itemTotal = priceEntry.price * parsedAmount;
    cart.total += itemTotal;

    if (!cart.timeout) {
        cart.timeout = new Date(Date.now() + 10 * 60 * 1000);
    }

    await cart.save();
    await cart.populate('items.dishId');
    res.json(cart);
};

const removeFromCart = async (req, res) => {
  const { dishId, dose } = req.body;
  const userId = req.user._id;

  try {
    let cart = await Cart.findOne({ userId }).populate('items.dishId');
    if (!cart) return res.status(404).json({ message: 'Carrinho não encontrado.' });

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

      await cart.save();
      return res.status(200).json(cart);
    } else {
      return res.status(404).json({ message: 'Item não encontrado no carrinho.' });
    }
  } catch (err) {
    console.error('Erro ao remover item do carrinho:', err);
    return res.status(500).json({ message: 'Erro interno ao remover item.' });
  }
};

const checkout = async (req, res) => {
  const orderId = req.query.orderId;

  try {
    const order = await Order.findById(orderId).populate('dishes.dishId');
    if (!order) {
      return res.status(404).json({ message: "Encomenda não encontrada." });
    }

    return res.status(200).json(order);
  } catch (err) {
    console.error("Erro no checkout:", err);
    res.status(500).json({ message: "Erro ao processar o checkout." });
  }
};

const createOrderFromCart = async (req, res) => {
  const userId = req.user._id;

  try {
    const cart = await Cart.findOne({ userId }).populate('items.dishId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Carrinho vazio.' });
    }

    const uniqueRestaurants = new Set(cart.items.map(item => item.dishId.restaurantId.toString()));
    if (uniqueRestaurants.size > 1) {
      return res.status(400).json({ message: 'Todos os pratos da encomenda devem ser do mesmo restaurante.' });
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

    return res.status(201).json({
      message: 'Encomenda criada com sucesso.',
      orderId: order._id,
      orderCode: order.orderCode
    });
  } catch (err) {
    console.error("Erro ao criar encomenda:", err);
    res.status(500).json({ message: 'Erro ao criar a encomenda.' });
  }
};

const createStripeSession = async (req, res) => {
  try {
    console.log(req.body);
    const { orderId, dishes } = req.body;

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
      success_url: `${req.headers.origin}/cliente/carrinho/pagamento-sucesso?orderId=${orderId}`,
      cancel_url: `${req.headers.origin}/user/perfil`,
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

    res.redirect(`/cliente/dashboard`);
  } catch (err) {
    console.error("Erro ao finalizar pagamento:", err);
    res.status(500).send("Erro ao concluir o pagamento.");
  }
};

module.exports = {
    listRestaurants,
    readRestaurant,
    readMenu,
    listMenus,
    listDishes,
    showCustomerDashboard,
    viewCart,
    addToCart,
    removeFromCart,
    checkout,
    createOrderFromCart,
    createStripeSession,
    handlePaymentSuccess
};