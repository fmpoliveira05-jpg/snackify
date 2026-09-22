const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');
const { 
  showPendingRestaurants, 
  validateRestaurant, 
  rejectRestaurant, 
  createCategory, 
  showCategories,
  deleteCategory, 
  showCheckedRestaurants, 
  deleteRestaurant, 
  disableRestaurant 
} = require('../controllers/adminController');

/**
 * @swagger
 * /admin/validar-restaurantes:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de carregar a página que permite ao administrador validar os restaurantes que ainda não foram validados
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de restaurantes pendentes.
 *       401:
 *         description: Não autorizado.
 */
router.get('/validar-restaurantes', authMiddleware, isAdmin, showPendingRestaurants);

/**
 * @swagger
 * /admin/listar-restaurantes-validados:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de listar os restaurantes que já foram validados pelo administrador
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de restaurantes validados.
 *       401:
 *         description: Não autorizado.
 */
router.get('/listar-restaurantes-validados', authMiddleware, isAdmin, showCheckedRestaurants);

/**
 * @swagger
 * /admin/listar-categorias:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de listar todas as categorias disponíveis
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de categorias.
 *       401:
 *         description: Não autorizado.
 */
router.get('/listar-categorias', authMiddleware, isAdmin, showCategories);

/**
 * @swagger
 * /admin/validar-restaurante/{id}:
 *   post:
 *     summary: Nós criamos esta rota com o objetivo de validar o restaurante selecionado pelo administrador
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do restaurante a validar.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restaurante validado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Restaurante não encontrado.
 */
router.post('/validar-restaurante/:id', authMiddleware, isAdmin, validateRestaurant);

/**
 * @swagger
 * /admin/rejeitar-restaurante/{id}:
 *   post:
 *     summary: Nós criamos esta rota com o objetivo de rejeitar um restaurante pendente de validação
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do restaurante a rejeitar.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restaurante rejeitado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Restaurante não encontrado.
 */
router.post('/rejeitar-restaurante/:id', authMiddleware, isAdmin, rejectRestaurant);

/**
 * @swagger
 * /admin/desativar-restaurante/{id}:
 *   post:
 *     summary: Nós criamos esta rota com o objetivo de desativar temporariamente um restaurante já existente
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do restaurante a desativar.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restaurante desativado com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Restaurante não encontrado.
 */
router.post('/desativar-restaurante/:id', authMiddleware, isAdmin, disableRestaurant);

/**
 * @swagger
 * /admin/categorias:
 *   get:
 *     summary: Nós criamos esta rota com o objetivo de retornar todas as categorias disponíveis (rota duplicada de listar-categorias)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de categorias.
 *       401:
 *         description: Não autorizado.
 */
router.get('/categorias', authMiddleware, isAdmin, showCategories);

/**
 * @swagger
 * /admin/editar-categorias:
 *   post:
 *     summary: Nós criamos esta rota com o objetivo de criar ou editar categorias de restaurantes
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome da categoria.
 *     responses:
 *       200:
 *         description: Categoria criada ou editada com sucesso.
 *       401:
 *         description: Não autorizado.
 *       400:
 *         description: Dados inválidos.
 */
router.post('/editar-categorias', authMiddleware, isAdmin, createCategory);

/**
 * @swagger
 * /admin/remover-categoria/{id}:
 *   delete:
 *     summary: Nós criamos esta rota com o objetivo de remover uma categoria existente
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID da categoria a remover.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Categoria removida com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Categoria não encontrada.
 */
router.delete('/remover-categoria/:id', authMiddleware, isAdmin, deleteCategory);

/**
 * @swagger
 * /admin/remover-restaurante/{id}:
 *   delete:
 *     summary: Nós criamos esta rota com o objetivo de remover permanentemente um restaurante do sistema
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do restaurante a remover.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restaurante removido com sucesso.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Restaurante não encontrado.
 */
router.delete('/remover-restaurante/:id', authMiddleware, isAdmin, deleteRestaurant);

module.exports = router;