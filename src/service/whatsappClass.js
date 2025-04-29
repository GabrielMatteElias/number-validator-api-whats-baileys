// Importa bibliotecas necessárias
const { Client, LocalAuth } = require('whatsapp-web.js'); // Biblioteca para integração com o WhatsApp Web
const qrcode = require('qrcode-terminal'); // Gera QR Code no terminal
const fs = require('fs'); // Manipulação de arquivos

// ================ // Classe para acessar funções do WhatsApp  \\ ================ \\
class WhatsAppClient {
    constructor() {
        this.qr = ''; // QR Code para autenticação
    }

    // Inicializa o cliente do WhatsApp
    async inicializarClient() {
        console.log(`Iniciando cliente`);

        this.client = new Client({
            authStrategy: new LocalAuth({ clientId: 'validador' }), // Define estratégia de autenticação local
            puppeteer: {
                args: ['--disable-logging'], // Desativa logs do Puppeteer
            },
            qrMaxRetries: 1
        });

        this._attachProcessHandlers(); // Lida com erros inesperados

        await this._eventoControlarSessao(); // Configura eventos relacionados à sessão

        try {
            await this.client.initialize(); // Inicializa o cliente do WhatsApp

            return { qr: this.qr }; // Retorna o cliente e o QR Code gerado
        } catch (error) {
            console.error(`Erro ao inicializar cliente`, error.message);
            throw new Error('Falha ao inicializar cliente.');
        }
    }

    // Conecta um cliente ao WhatsApp
    async conectarWhatsapp() {
        console.log('-----------------------------------');
        console.log(`Tentando conectar cliente`);

        try {
            const res = await this.inicializarClient();
            return res.qr;
        } catch (error) {
            console.error(`Erro ao inicializar cliente:`, error.message);
            return { status: 'erro', mensagem: 'Falha ao inicializar cliente.' };
        }
    }

    // Configura eventos para controle de sessão
    async _eventoControlarSessao() {

        this.client.on('qr', (qr) => {
            qrcode.generate(qr, { small: true }); // Gera QR Code no terminal
            this.qr = qr;
        });

        this.client.on('ready', async () => {
            console.log("Client pronto");
        });

        this.client.on('disconnected', async (reason) => {
            console.log(`Cliente desconectado: ${reason}`);

            // Gera desconexão
            await this._handleClientError();
        });
    }

    // Valida se o número tem WhatsApp
    async validarWhatsapp(telefone) {
        console.log('-----------------------------------');
        console.log(`Validando WhatsApp para telefone: ${telefone}`);

        if (!this.client) {
            await this.inicializarClient();
        }

        const estado = await this.client.getState();
        if (estado !== 'CONNECTED') {
            console.log('Cliente não está conectado.');
            return 'sem conexao'; // Retorna se o cliente não estiver conectado
        }

        try {
            const result = await this.client.getNumberId(telefone);
            console.log(result); // Loga o resultado da validação

            console.log(`Número ${telefone} ${result ? 'possui' : 'não possui'} WhatsApp.`, result ? true : false);
            return !!result; // Retorna true se tiver WhatsApp, false caso contrário
        } catch (error) {
            console.error('Erro ao validar número no WhatsApp:', error.message);
            return false; // Caso ocorra um erro, retorna false por segurança
        }
    }

    // Trata erros inesperados
    _attachProcessHandlers() {
        process.on('unhandledRejection', async () => {
            await this._handleClientError();
        });

        process.on('uncaughtException', async () => {
            await this._handleClientError();
        });
    }

    // Remove sessão após desconexão
    async _handleClientError() {
        try {
            if (this.client) {
                await this.client.destroy();
            }
            fs.rmdir(this.sessionPath, (err) => {
                if (err) console.error('Erro ao remover sessão:', err.message);
            });
        } catch (err) {
            // Erro ignorado intencionalmente
        }
    }
}

module.exports = { WhatsAppClient }; // Exporta a classe para ser utilizada em outros módulos