require('dotenv').config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path');

// Conectar ao MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB conectado!"))
  .catch(err => console.error(err));

app.set('view engine', 'ejs'); // Configurar EJS como template engine
app.use(express.static(path.join(__dirname, 'public'))); // Para ficheiros estáticos
app.use(express.urlencoded({ extended: true })); // Para receber dados de formulários

// Rotas básicas
app.get('/', (req, res) => {
  res.render('index', { title: "Página Inicial" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor a rodar na porta ${PORT}`));
