const express = require('express');
const whatsappController = require('../controller/whatsapp.controller');

const router = express.Router(); // Cria um roteador para definir as rotas relacionadas ao WhatsApp

// Rota para conectar um cliente do WhatsApp
router.post('/conectar', whatsappController.conectarClient); // POST /whatsapp/conectar

// Rota para validar se um número possui WhatsApp
router.post('/validar-numero', whatsappController.validarWhatsApp); // POST /whatsapp/validar-numero

module.exports = router;
