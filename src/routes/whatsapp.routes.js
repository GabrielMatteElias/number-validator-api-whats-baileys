const express = require('express');
const whatsappController = require('../controller/whatsapp.controller');

const router = express.Router();

// POST /whatsapp/enviar-mensagem
router.post('/conectar', whatsappController.conectarClient);

// // POST /whatsapp/enviar-mensagem
// router.post('/enviar-mensagem', whatsappController.enviarMensagem);

// POST /whatsapp/validar-numero
router.post('/validar-numero', whatsappController.validarWhatsApp);

// // POST /whatsapp/verificar-sessao
// router.post('/verificar-sessao', whatsappController.verificarSessao);

module.exports = router;