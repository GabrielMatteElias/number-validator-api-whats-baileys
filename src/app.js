const express = require('express');
const bodyParser = require('body-parser');
const whatsappRoutes = require('./routes/whatsapp.routes');

const app = express(); // Cria uma aplicação Express
app.use(bodyParser.json()); // Configura o middleware Body-Parser para processar requisições com corpo em JSON

app.use('/whatsapp', whatsappRoutes); // Todas as rotas definidas em `whatsapp.routes` estarão disponíveis em "/whatsapp"

module.exports = app;
