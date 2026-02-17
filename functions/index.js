const { onRequest } = require("firebase-functions/v2/https");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Inicializa o Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.whatsappWebhook = onRequest(async (req, res) => {
    
    // --- ESTA É A PARTE QUE VALIDA O WEBHOOK (PARA A META) ---
    if (req.method === "GET") {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];

        // Aqui definimos a senha: SuaSenhaSeguraAqui
        if (mode === "subscribe" && token === "Miguel@1leo") {
            console.log("Webhook validado com sucesso!");
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    }

    // --- AQUI RECEBEMOS AS MENSAGENS DE TEXTO/ÁUDIO ---
    if (req.method === "POST") {
        console.log("Mensagem recebida do WhatsApp:", JSON.stringify(req.body, null, 2));
        
        // Responde sempre 200 OK para o WhatsApp não ficar reenviando a mesma mensagem
        res.sendStatus(200);
    }
});
