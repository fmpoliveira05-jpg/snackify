/**
 * Ligação ao MongoDB de teste e dados de exemplo para os testes de integração.
 */
const mongoose = require('mongoose');
const User = require('../../models/user');
const Restaurant = require('../../models/restaurant');
const Dish = require('../../models/dish');
const Menu = require('../../models/menu');
const Cart = require('../../models/cart');
const Category = require('../../models/category');
const Order = require('../../models/order');
const Voucher = require('../../models/voucher');
const Review = require('../../models/review');

const MODELS = [User, Restaurant, Dish, Menu, Cart, Category, Order, Voucher, Review];

/**
 * Liga a uma base de dados própria deste ficheiro de testes e cria os índices dos modelos.
 *
 * @param {string} name sufixo do nome da base de dados
 */
async function connect(name) {
  const base = process.env.MONGO_TEST_URI;
  if (!base) throw new Error('MONGO_TEST_URI não está definido (use npm run test:integracao).');
  const url = new URL(base);
  url.pathname = `/snackify_int_${name}`;
  await mongoose.connect(url.toString(), { serverSelectionTimeoutMS: 10000 });
  await mongoose.connection.dropDatabase();
  await Promise.all(MODELS.map((Model) => Model.syncIndexes()));
}

async function disconnect() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

/** Dígito de controlo do NIF português. */
const nifFor = (eightDigits) => {
  const n = String(eightDigits).padStart(8, '0').slice(0, 8).split('').map(Number);
  const sum = n.reduce((acc, digit, i) => acc + digit * (9 - i), 0);
  const mod = sum % 11;
  return `${n.join('')}${mod < 2 ? 0 : 11 - mod}`;
};

let counter = 0;
const next = () => { counter += 1; return counter; };

const address = (extra = {}) => ({
  street: 'Rua Direita',
  number: '10',
  zipCode: '4000-123',
  place: 'Porto',
  district: 'Porto',
  country: 'Portugal',
  ...extra,
});

async function createCustomer(extra = {}) {
  const i = next();
  return User.create({
    name: 'Ana Silva',
    username: `cliente${i}`,
    email: `cliente${i}@exemplo.pt`,
    password: '$2b$12$IRUEajE9QCWNByJ6.DfR3OE4aPVBQy4PJvVN59ZFf0YIZF2/Ts6Qi',
    birthDate: new Date('1990-01-01'),
    phone: '912345678',
    userType: 'customer',
    emailVerified: true,
    address: address(),
    ...extra,
  });
}

async function createRestaurant(extra = {}) {
  const i = next();
  return Restaurant.create({
    name: `Tasca ${i}`,
    username: `tasca${i}`,
    email: `tasca${i}@exemplo.pt`,
    password: '$2b$12$IRUEajE9QCWNByJ6.DfR3OE4aPVBQy4PJvVN59ZFf0YIZF2/Ts6Qi',
    phone: '223456789',
    nif: nifFor(50000000 + i),
    foundedAt: new Date('2000-01-01'),
    isChecked: true,
    emailVerified: true,
    address: address(),
    ...extra,
  });
}

async function createCategory(name = `Categoria ${next()}`) {
  return Category.create({ name });
}

async function createDish(restaurant, category, extra = {}) {
  return Dish.create({
    restaurantId: restaurant._id,
    name: `Prato ${next()}`,
    category: category._id,
    pricePerDose: [{ dose: '1', price: 10 }, { dose: '1/2', price: 6 }],
    ...extra,
  });
}

/** Põe um prato no carrinho do cliente (com o prazo dos 10 minutos a correr). */
async function fillCart(customer, dish, amount = 1) {
  return Cart.findOneAndUpdate(
    { userId: customer._id },
    { $set: { items: [{ dishId: dish._id, amount, dose: '1' }], total: 10 * amount, timeout: new Date(Date.now() + 10 * 60 * 1000) } },
    { upsert: true, new: true },
  );
}

module.exports = {
  connect,
  disconnect,
  nifFor,
  createCustomer,
  createRestaurant,
  createCategory,
  createDish,
  fillCart,
  models: { User, Restaurant, Dish, Menu, Cart, Category, Order, Voucher, Review },
};
