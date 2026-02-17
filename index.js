const { onRequest } = require("firebase-functions/v2/https");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.whatsappWebhook = onRequest(async (req, res) => {
    // Validação para o Meta/WhatsApp configurar o Webhook
    if (req.method === "GET") {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];
        
        if (mode === "subscribe" && token === "SuaSenhaSeguraAqui") {
            return res.status(200).send(challenge);
        }
    }

    // Recebimento da mensagem
    if (req.method === "POST") {
        const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        
        if (message?.text?.body) {
            const prompt = `Extraia dados de agendamento: "${message.text.body}". Hoje é 17/02/2026.`;
            const model = genAI.getGenerativeModel({ 
                model: "gemini-2.0-flash",
                generationConfig: { responseMimeType: "application/json" }
            });

            const result = await model.generateContent(prompt);
            console.log("JSON Gerado:", result.response.text());
            
            // Aqui entraremos com a função do Google Agenda no próximo passo
        }
        res.sendStatus(200);
    }
});
