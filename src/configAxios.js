const axios = require("axios");

const instance = axios.create({
    baseURL: "http://zap.hoepers.com:9058/v1", // URL base da API
    timeout: 15000, // Tempo limite de resposta (15 segundos)
    headers: {
        "Content-Type": "application/json",
    },
});

module.exports = { instance };
