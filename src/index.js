const app = require('./app');

const PORT = process.env.PORT || 8000;

async function iniciarServidor() {

    try {
        // Inicia o servidor
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Servidor rodando na porta ${PORT}`);
        });

    } catch (error) {
        process.exit(1);
    }
}

iniciarServidor();