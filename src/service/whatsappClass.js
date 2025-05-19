const { useMultiFileAuthState, isJidBroadcast, delay, DisconnectReason, fetchLatestBaileysVersion, Browsers, makeWASocket, downloadContentFromMessage } = require('baileys');
const fs = require('fs');
const path = require('path');
// const { gravarDesconexao, gravarConexao, gravarMensagem } = require('./api.service');
const { default: pino } = require('pino');
const qrcode = require('qrcode-terminal'); // Gera QR Code no terminal

const clients = {};

const sessionPath = './session';

// ================ // Classe para acessar funções do WhatsApp com Baileys \\ ================ \\
class WhatsAppClient {
    constructor(id) {
        this.id = id;
        this.qr = '';
        this.status = 'disconnected';
        this.pairingCode = '';
    }

    // Inicializa o cliente do WhatsApp
    async inicializarClient(id, telefone) {
        console.log(`Iniciando cliente para ID: ${id}`);

        const { state, saveCreds } = await useMultiFileAuthState(`${sessionPath}/${id}`); // Cria um diretório de sessão específico para cada cliente

        const { version } = await fetchLatestBaileysVersion();

        this.client = makeWASocket({
            logger: pino({ level: 'error' }), // silencia tudo
            version,
            printQRInTerminal: true,
            auth: state,
            browser: Browsers.ubuntu('Chrome'),
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            shouldIgnoreJid: jid => isJidBroadcast(jid),
        });

        // this._attachProcessHandlers();

        const connectionPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout ao estabelecer conexão'));
            }, 30000);

            this.client.ev.on('connection.update', (update) => {
                if (update.qr) {
                    qrcode.generate(update.qr, { small: true });
                    clearTimeout(timeout);
                    resolve(update);
                }
                if (update.connection === 'open') {
                    clearTimeout(timeout);
                    resolve('Id conectado');
                }
            });
        });

        this._eventoControlarSessao(id, telefone);
        // this._eventoRegistrarMensagens();

        // Salva credenciais quando mudarem
        this.client.ev.on('creds.update', saveCreds);

        clients[id] = this.client;

        try {
            const result = await connectionPromise;
            if (result.connected) {
                console.log(`Sessão ${id} restaurada com sucesso`);
                return 'Id conectado';
            }
            return result.qr;
        } catch (error) {
            console.error(`Erro na conexão do cliente ${id}:`, error.message);
            throw error;
        }
    }

    // Obtém um cliente específico pelo ID
    getClientPorId(id) {
        return clients[id];
    }

    // Conecta um cliente ao WhatsApp
    async conectarWhatsapp(id, telefone) {
        console.log('-----------------------------------');
        console.log(`Tentando conectar cliente ID: ${id}`);

        const clientAlvo = this.getClientPorId(id);

        if (clientAlvo) {
            console.log(`Client com ID ${id} já POSSUI sessão.`);
            return `Id conectado`;
        }

        try {
            const res = await this.inicializarClient(id, telefone);

            return { res };
        } catch (error) {
            console.error(`Erro ao inicializar cliente ${id}:`, error.message);
            return { status: 'erro', mensagem: 'Falha ao inicializar cliente.' };
        }
    }

    // Configura eventos para controle de sessão
    async _eventoControlarSessao(id, telefone) {
        this.client.ev.on('connection.update', async (update) => {

            const { connection, lastDisconnect } = update;

            if (connection === 'connecting') {
                this.status = 'connecting';
                console.log(`Cliente ${id} conectando...`);
            }

            if (connection === 'open') {
                this.status = 'connected';

                // Verifica número do WhatsApp
                // const user = this.client.user;
                // const telefoneLeituraQrcode = user.id.split(':')[0];
                // const telefoneLeituraQrcodeSemDDI = telefoneLeituraQrcode.startsWith("55")
                //     ? telefoneLeituraQrcode.slice(2)
                //     : telefoneLeituraQrcode;

                // const telefoneSemNove = telefone.length === telefoneLeituraQrcodeSemDDI.length + 1 && telefone[2] === "9"
                //     ? telefone.slice(0, 2) + telefone.slice(3)
                //     : telefone;

                // if (telefoneLeituraQrcodeSemDDI !== telefoneSemNove) {
                //     console.log('Número usado para ler QR code diferente do número cadastrado.');
                //     await this.client.logout();
                //     delete clients[id];
                //     gravarDesconexao(id, true);
                //     return;
                // }

                console.log(`Cliente ${id} conectado com sucesso!`);
                // gravarConexao(id);
            }

            const nonReconnectableReasons = [
                // DisconnectReason.connectionClosed,    // 428: Conexão fechada (pode ser intencional ou um erro)
                // DisconnectReason.connectionReplaced,  // 440: Conexão substituída por outra sessão
                DisconnectReason.loggedOut,           // 401: Usuário deslogou ou sessão invalidada
                // DisconnectReason.badSession,          // 500: Sessão inválida/corrompida (geralmente requer nova autenticação)
                // DisconnectReason.forbidden,           // 403: Acesso proibido (ex: número banido)
                // DisconnectReason.unavailableService,   // 503: Serviço indisponível (ex: servidor WhatsApp fora do ar)
                // DisconnectReason.timedOut           // 408: Tempo limite de conexão (pode ser temporário)
            ];

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = !nonReconnectableReasons.includes(statusCode); // 401 é um exemplo comum para 'loggedOut'

                if (shouldReconnect) {
                    await delay(5000);
                    this.inicializarClient(id, telefone);
                } else {
                    console.log(`Cliente ${id} desconectado.`);
                    delete clients[id];
                    // await gravarDesconexao(id);

                    const sessionDir = path.resolve(__dirname, sessionPath, id);

                    if (fs.existsSync(sessionDir)) {
                        fs.rmSync(sessionDir, { recursive: true, force: true });
                        console.log(`Pasta da sessão para ${id} removida.`);
                    }
                    return;
                }
            }
        });
    }

    // Configura evento para registrar mensagens recebidas
    // async _eventoRegistrarMensagens() {
    //     this.client.ev.on('messages.upsert', async ({ messages, type }) => {

    //         if (type !== 'notify') return;

    //         for (const message of messages) {
    //             const fromMe = message.key.fromMe;

    //             // Obtém o JID completo (pode ser individual ou grupo)
    //             const remoteJid = message.key.remoteJid;

    //             // Determina remetente e destinatário corretamente
    //             let remetente, destinatario;

    //             if (fromMe) {
    //                 // Se a mensagem foi enviada por mim
    //                 remetente = this.client.user.id.split(':')[0]; // Meu número
    //                 destinatario = remoteJid.includes('@g.us')
    //                     ? remoteJid // Se for grupo, o destinatário é o grupo
    //                     : remoteJid.split('@')[0]; // Se for individual, o número do contato
    //             } else {
    //                 // Se a mensagem foi recebida
    //                 if (remoteJid.includes('@g.us')) {
    //                     // Mensagem em grupo
    //                     remetente = participant ? participant.split('@')[0] : remoteJid.split('@')[0];
    //                     destinatario = remoteJid; // O grupo é o destinatário
    //                 } else {
    //                     // Mensagem individual
    //                     remetente = remoteJid.split('@')[0];
    //                     destinatario = this.client.user.id.split(':')[0]; // Meu número
    //                 }
    //             }

    //             const mensagem = message.message?.conversation || '';

    //             if (!message) {
    //                 return;
    //             }

    //             const mensagemBase64 = Buffer.from(mensagem || '', 'utf-8').toString('base64');

    //             if (message.message?.imageMessage || message.message?.videoMessage || message.message?.documentMessage) {

    //                 const mediaData = await this.downloadMedia(message);

    //                 gravarMensagem(remetente, destinatario, mensagemBase64, fromMe, mediaData);
    //             } else {
    //                 gravarMensagem(remetente, destinatario, mensagemBase64, fromMe);
    //             }

    //         }
    //     });
    // }

    // // Baixa mídia das mensagens
    // async downloadMedia(message) {
    //     try {
    //         const stream = await downloadContentFromMessage(
    //             message.message?.imageMessage ||
    //             message.message?.videoMessage ||
    //             message.message?.documentMessage,
    //             message.message?.imageMessage ? 'image' :
    //                 message.message?.videoMessage ? 'video' : 'document'
    //         );

    //         let buffer = Buffer.from([]);
    //         for await (const chunk of stream) {
    //             buffer = Buffer.concat([buffer, chunk]);
    //         }

    //         return buffer.toString('base64');
    //     } catch (error) {
    //         console.error('Erro ao baixar mídia:', error);
    //         return null;
    //     }
    // }

    // // Envia mensagem e mídia (boleto)
    // async enviarMensagem(id, telefone, mensagem, nomeBoleto, boleto) {
    //     console.log('-----------------------------------');
    //     console.log('ENVIO MENSAGEM');
    //     console.log(`ID do Cliente: ${id}`);
    //     console.log(`Telefone devedor: ${telefone}`);

    //     const clientAlvo = this.getClientPorId(id);

    //     if (!clientAlvo) {
    //         console.log(`Client ${id} NÃO POSSUI sessão ativa`);
    //         return { envio: false, msg: 'Número desconectado' };
    //     }

    //     try {
    //         const jid = `${telefone}@s.whatsapp.net`;
    //         const isRegistered = await this.validarWhatsapp(id, telefone);

    //         if (!isRegistered) {
    //             console.log('Whatsapp inválido');
    //             return { envio: false, msg: 'Whatsapp inválido' };
    //         }

    //         if (nomeBoleto && boleto) {
    //             const boletoBuffer = Buffer.from(boleto, 'base64');
    //             await clientAlvo.sendMessage(jid, {
    //                 document: boletoBuffer,
    //                 fileName: nomeBoleto,
    //                 mimetype: 'application/pdf'
    //             });
    //         }

    //         await clientAlvo.sendMessage(jid, { text: mensagem });
    //         console.log('Envio finalizado!');

    //         return { envio: true, msg: 'Enviado com sucesso' };
    //     } catch (error) {
    //         console.error('Erro ao enviar mensagem:', error);
    //         return { envio: false, msg: error.message };
    //     }
    // }

    // Valida se o número tem WhatsApp
    async validarWhatsapp(id, telefone) {
        console.log('-----------------------------------');
        console.log(`Validando WhatsApp para o ID: ${id}, Telefone: ${telefone}`);

        const clientAlvo = this.getClientPorId(id);

        if (!clientAlvo) {
            console.warn(`Cliente com ID ${id} não encontrado ou sem conexão.`);
            return 'sem conexao';
        }

        try {
            const jid = `${telefone}@s.whatsapp.net`;
            const [result] = await clientAlvo.onWhatsApp(jid);

            console.log(`Número ${telefone} ${result ? 'possui' : 'não possui'} WhatsApp.`, !!result);
            return !!result;
        } catch (error) {
            console.error('Erro ao validar número no WhatsApp:', error.message);
            return false;
        }
    }

    // Verifica se a sessão está ativa
    // async verificarSessao(id) {
    //     console.log('-----------------------------------');
    //     console.log(`Verificando sessão para o ID: ${id}`);

    //     const clientAlvo = this.getClientPorId(id);

    //     if (!clientAlvo) {
    //         console.warn(`Cliente com ID ${id} não encontrado ou sem conexão.`);
    //         return false;
    //     }

    //     try {
    //         const user = clientAlvo.user;
    //         return !!user;
    //     } catch (error) {
    //         console.error(`Erro ao verificar sessão do cliente ${id}:`, error.message);
    //         return false;
    //     }
    // }

    // // Trata erros inesperados
    // _attachProcessHandlers() {
    //     process.on('unhandledRejection', async () => {
    //         await this._handleClientError();
    //     });

    //     process.on('uncaughtException', async () => {
    //         await this._handleClientError();
    //     });
    // }

    // // Remove sessão após desconexão
    // async _handleClientError() {
    //     try {
    //         if (this.client) {
    //             await this.client.end();
    //         }
    //         // Limpa a sessão se necessário
    //         const sessionPath = path.join(__dirname, `./sessions/${this.id}`);
    //         if (fs.existsSync(sessionPath)) {
    //             fs.rmSync(sessionPath, { recursive: true });
    //         }
    //     } catch (err) {
    //         console.error('Erro ao lidar com erro do cliente:', err.message);
    //     }
    // }
}

module.exports = { WhatsAppClient };