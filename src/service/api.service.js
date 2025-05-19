const { instance } = require("../configAxios");

async function manipularEstadoSessao(url, payload, acao) {
    console.log(`[${acao}] Enviando requisição para ${url} com payload:`, payload);

    try {
        const response = await instance.post(url, payload);
        console.log(`[${acao}] Sucesso:`, response.status, response.data);
        return response.data;
    } catch (error) {
        console.error(`[${acao}] Erro:`, error.message);
    }
}

async function gravarConexao(id) {
    return manipularEstadoSessao('/configuracao/conectar-confirmar', { id: Number(id) }, 'Gravar Conexão');
}

async function gravarDesconexao(id, numeroDiferente) {
    return manipularEstadoSessao('/configuracao/alerta-desconectar', { id: Number(id), numero_diferente: numeroDiferente ? numeroDiferente : false }, 'Gravar Desconexão');
}

async function gravarMensagem(remetente, destinatario, mensagem, fromMe, midia) {
    if (!mensagem && !midia) {
        return
    }
    const dadosWhatsApp = {
        "from_me": fromMe,
        "de": remetente,
        "para": destinatario,
        "mensagem": mensagem,
        "midia": midia
    }

    console.log(`------------------------------`);
    console.log(`🔹 Registrando mensagem 🔹`);
    console.log('Midia: ', midia ? true : false)

    const payload = {};

    // Percorre cada chave do objeto
    for (const chave in dadosWhatsApp) {
        const valor = dadosWhatsApp[chave];

        // Verifica se o valor não é null, undefined ou string vazia
        if (valor !== null && valor !== undefined && valor !== '') {
            payload[chave] = valor;
        }
    }
    console.log(payload);

    try {
        const response = await instance.put('/historico/gravar', payload)

        console.log(`[Gravar Mensagem] Sucesso: ${response.status} - ${response.data.msg}`);
    } catch (error) {
        console.error(`[Gravar Mensagem] Erro:`, error.message);
    }
}

module.exports = {
    gravarMensagem,
    gravarConexao,
    gravarDesconexao,
}