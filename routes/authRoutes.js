const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

router.post('/register', register);

router.post('/login', login);

router.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
});

module.exports = router;