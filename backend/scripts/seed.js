/**
 * Prepara uma base de dados vazia para experimentar a plataforma:
 *  - cria a conta de administrador (a única forma de validar restaurantes);
 *  - cria as categorias de pratos mais comuns.
 *
 * Uso: npm run seed
 * As credenciais podem ser alteradas com ADMIN_USERNAME, ADMIN_PASSWORD e ADMIN_EMAIL no .env.
 */
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { config, assertRequiredConfig } = require('../config/env');
const User = require('../models/user');
const Category = require('../models/category');

const DEFAULT_CATEGORIES = ['Carne', 'Peixe', 'Vegetariano', 'Sobremesa', 'Entradas', 'Bebidas'];

/** Dados do administrador; exportado para poder ser validado nos testes sem base de dados. */
function adminData(passwordHash) {
  return {
    name: 'Administrador Snackify',
    username: process.env.ADMIN_USERNAME || 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@snackify.local',
    password: passwordHash,
    birthDate: new Date('1990-01-01'),
    phone: '912345678',
    userType: 'admin',
    address: {
      street: 'Rua Principal',
      number: '1',
      zipCode: '4000-001',
      place: 'Porto',
      district: 'Porto',
      country: 'Portugal',
    },
  };
}

/**
 * Cria o administrador inicial e as categorias por omissão (pode correr-se mais do que uma vez).
 */
async function seed() {
  assertRequiredConfig();
  await mongoose.connect(config.mongoUri);

  const password = process.env.ADMIN_PASSWORD || 'Admin#2025';
  const admin = adminData(await bcrypt.hash(password, 10));
  if (await User.exists({ username: admin.username })) {
    console.log(`O administrador "${admin.username}" já existe.`);
  } else {
    await User.create(admin);
    console.log(`Administrador criado: ${admin.username} / ${password}`);
  }

  for (const name of DEFAULT_CATEGORIES) {
    await Category.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true });
  }
  console.log(`Categorias disponíveis: ${DEFAULT_CATEGORIES.join(', ')}`);

  await mongoose.disconnect();
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('Falha no seed:', err.message);
    process.exit(1);
  });
}

module.exports = { adminData, DEFAULT_CATEGORIES };
