const app = require('./app');
const port = 8000;

(async () => {
    //await getSessoes(); // Busca as sessões e inicializa os clientes
    app.listen(port, () => {
        console.log(`Servidor rodando na porta ${port}`);
    });
})();