/**
 * Prepara uma base de dados vazia para experimentar a plataforma:
 *  - cria a conta de administrador (a única forma de validar restaurantes);
 *  - cria as categorias de pratos mais comuns.
 *
 * Uso: npm run seed
 * As credenciais são definidas com ADMIN_USERNAME, ADMIN_PASSWORD e ADMIN_EMAIL no .env.
 * Sem ADMIN_PASSWORD é gerada uma password aleatória forte, mostrada só fora de produção
 * (em produção, defina ADMIN_PASSWORD ou use "Esqueci-me da password" depois do seed).
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { config, assertRequiredConfig } = require('../config/env');
const User = require('../models/user');
const Category = require('../models/category');
const { BCRYPT_COST, PASSWORD_MESSAGE, isStrongPassword } = require('../utils/passwordPolicy');

const DEFAULT_CATEGORIES = ['Carne', 'Peixe', 'Vegetariano', 'Sobremesa', 'Entradas', 'Bebidas'];

/** Dados do administrador; exportado para poder ser validado nos testes sem base de dados. */
function adminData(passwordHash) {
  return {
    name: 'Administrador Snackify',
    username: process.env.ADMIN_USERNAME || 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@snackify.local',
    password: passwordHash,
    // Conta criada por quem gere o servidor: o email é dado como confirmado.
    emailVerified: true,
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
 * Gera uma password aleatória que cumpre a regra (20 carateres, com todos os tipos exigidos).
 */
function generateStrongPassword() {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%&*-_=+?'];
  const all = sets.join('');
  const pick = (chars) => chars[crypto.randomInt(chars.length)];
  const chars = sets.map(pick);
  while (chars.length < 20) chars.push(pick(all));
  // Baralha (Fisher-Yates) para os carateres obrigatórios não ficarem sempre no início.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/**
 * Password do administrador: ADMIN_PASSWORD (tem de cumprir a regra) ou uma gerada ao acaso.
 *
 * @returns {{password: string, generated: boolean}}
 */
function resolveAdminPassword(value = process.env.ADMIN_PASSWORD) {
  if (value) {
    if (!isStrongPassword(value)) {
      throw new Error(`ADMIN_PASSWORD não cumpre a regra das passwords. ${PASSWORD_MESSAGE}`);
    }
    return { password: value, generated: false };
  }
  return { password: generateStrongPassword(), generated: true };
}

/**
 * Cria o administrador inicial e as categorias por omissão (pode correr-se mais do que uma vez).
 */
async function seed() {
  assertRequiredConfig();
  await mongoose.connect(config.mongoUri);

  const { password, generated } = resolveAdminPassword();
  const admin = adminData(await bcrypt.hash(password, BCRYPT_COST));
  if (await User.exists({ username: admin.username })) {
    console.log(`O administrador "${admin.username}" já existe.`);
  } else {
    await User.create(admin);
    if (config.isProduction) {
      // Em produção a password nunca é escrita na consola (ficaria nos registos do servidor).
      console.log(`Administrador criado: ${admin.username}.${generated ? ' Defina a password com "Esqueci-me da password".' : ''}`);
    } else {
      console.log(`Administrador criado: ${admin.username} / ${password}${generated ? ' (password gerada; guarde-a)' : ''}`);
    }
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

module.exports = { adminData, DEFAULT_CATEGORIES, generateStrongPassword, resolveAdminPassword };
