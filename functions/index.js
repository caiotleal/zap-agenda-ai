const { onRequest } = require("firebase-functions/v2/https");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.whatsappWebhook = onRequest(async (req, res) => {
    if (req.method === "GET") {
        return res.status(200).send(req.query["hub.challenge"]);
    }

    if (req.method === "POST") {
        console.log("Mensagem recebida:", JSON.stringify(req.body));
        res.sendStatus(200);
    }
});
