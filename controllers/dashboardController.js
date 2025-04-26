const Order = require('../models/order');

const showRestaurantDashboard = async (req, res) => {
  try {
    const orderStats = await Order.aggregate([
      { $group: { _id: "$state", count: { $sum: 1 } } },
      { $project: { _id: 0, state: "$_id", count: 1 } }
    ]);

    res.render('dashboards/restaurantDashboard', { orderStats });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar dados de encomendas.');
  }
};
  
const showCustomerDashboard = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ orderDate: -1 }).limit(5).populate('dishes.dishId');

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

    res.render('dashboards/customerDashboard', { orderTotals });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar dados das encomendas.');
  }
};

module.exports = {
  showRestaurantDashboard,
  showCustomerDashboard
};