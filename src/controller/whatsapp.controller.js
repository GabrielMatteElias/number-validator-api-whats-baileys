const { WhatsAppClient } = require('../service/whatsappClass.js');

const client = new WhatsAppClient();

exports.conectarClient = async (req, res) => { //Função para conectar um cliente ao WhatsApp
    try {

        const conexao = await client.conectarWhatsapp();

        return res.status(200).json({ res: conexao });
    } catch (error) {
        console.error('Erro ao conectar cliente: ', error.message);
        return res.status(500).json({ error: 'Erro interno ao conectar cliente.' });
    }
};

exports.validarWhatsApp = async (req, res) => { // Função para validar se um número possui WhatsApp
    try {
        const { telefone } = req.body

        if (!telefone) return res.status(400).json({ error: 'O campo telefone é obrigatório.' });


        let numero = telefone; // remove tudo que não é número

        if (numero.length === 11 || numero.length === 10) {
            numero = `55${numero}`;
            console.log(`Número sem DDI: ${numero}`);
            
        } else if (numero.length === 13 || numero.length === 12) {
            // já está com 55
            console.log(`Número com DDI: ${numero}`);
            
        } else {
            return res.status(400).json({ error: 'Formato de número inválido' });
        }


        const resValidacao = await client.validarWhatsapp(numero);

        return res.status(resValidacao === 'sem conexao' ? 203 : 200).json({ res: resValidacao });
    } catch (error) {
        console.error('Erro ao validar número: ', error);
        return res.status(500).json({ error: 'Erro interno ao validar número.' });
    }
};
