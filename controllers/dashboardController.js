const showRestaurantDashboard = (req, res) => {
    res.render('dashboards/restaurantDashboard');
  };
  
  const showCustomerDashboard = (req, res) => {
    res.render('dashboards/customerDashboard');
  };
  
  module.exports = {
    showRestaurantDashboard,
    showCustomerDashboard
  };  