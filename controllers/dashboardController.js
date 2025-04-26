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
    const userId = req.user._id;

    const orders = await Order.find({ userId }).sort({ orderDate: -1 }).limit(5).populate('dishes.dishId');

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

    res.render('dashboards/customerDashboard', { orderTotals, isBlocked: !!blockedUntil, blockedUntil: blockedUntil ? blockedUntil.toLocaleDateString('pt-PT') : null });

  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar dados das encomendas.');
  }
};

module.exports = {
  showRestaurantDashboard,
  showCustomerDashboard
};