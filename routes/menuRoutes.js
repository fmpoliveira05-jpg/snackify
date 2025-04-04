const express = require('express');
const Menu = require('../models/menu');
const Dish = require('../models/dish');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/create', async (req, res) => {
    const { name, categories } = req.body;
    const restaurantId = req.userId;

    try {
        const newMenu = new Menu({ restaurantId, name, categories });
        await newMenu.save();
        res.status(201).json({ message: "Menu criado com sucesso!" });
    } catch (error) {
        res.status(500).json({ message: "Erro ao criar menu", error: error.message });
    }
});

router.get('/list', async (req, res) => {
    const restaurantId = req.userId;

    try {
        const menus = await Menu.find({ restaurantId });
        res.json(menus);
    } catch (error) {
        res.status(500).json({ message: "Erro ao obter menus", error: error.message });
    }
});

router.post('/dish/create', authMiddleware, async (req, res) => {
    const { name, description, price, image } = req.body;
    const restaurantId = req.userId;

    try {
        if (!restaurantId) {
            return res.status(400).json({ message: "ID do restaurante não encontrado no token." });
        }

        const newDish = new Dish({ name, description, price, image, restaurantId });
        await newDish.save();
        res.status(201).json({ message: "Prato criado com sucesso!", dish: newDish });
    } catch (error) {
        res.status(500).json({ message: "Erro ao criar prato", error: error.message });
    }
});

router.post('/add-dish/:menuId', async (req, res) => {
    const { dishId } = req.body;
    const { menuId } = req.params;

    try {
        const menu = await Menu.findById(menuId);
        if (!menu) return res.status(404).json({ message: "Menu não encontrado!" });

        menu.dishes.push(dishId);
        await menu.save();
        res.json({ message: "Prato adicionado ao menu com sucesso!" });
    } catch (error) {
        res.status(500).json({ message: "Erro ao adicionar prato ao menu", error: error.message });
    }
});

router.get('/list', async (req, res) => {
    const restaurantId = req.userId;

    try {
        const menus = await Menu.find({ restaurantId }).populate('dishes');
        res.json(menus);
    } catch (error) {
        res.status(500).json({ message: "Erro ao obter menus", error: error.message });
    }
});

module.exports = router;
