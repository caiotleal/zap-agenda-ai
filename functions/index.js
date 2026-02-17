const { onRequest } = require("firebase-functions/v2/https");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { google } = require("googleapis");

// Inicialização das APIs
// Nota: Certifique-se de configurar a variável GEMINI_API_KEY no Firebase ou GitHub Secrets
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const calendar = google.calendar("v3");

// Autenticação com o Google Calendar
const auth = new google.auth.GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/calendar"],
});

exports.whatsappWebhook = onRequest(async (req, res) => {
  
  // 1. VALIDAÇÃO DO WEBHOOK (Aperto de mão com a Meta)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    // Use o mesmo token que você configurou no painel da Meta
    if (mode === "subscribe" && token === "SuaSenhaSeguraAqui") {
      console.log("Webhook validado!");
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  }

  // 2. PROCESSAMENTO DA MENSAGEM (POST)
  if (req.method === "POST") {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (message?.text?.body) {
      const textoUsuario = message.text.body;
      const numeroUsuario = message.from;

      try {
        // Configuração do modelo Gemini
        const model = genAI.getGenerativeModel({ 
          model: "gemini-2.0-flash",
          generationConfig: { responseMimeType: "application/json" }
        });

        // Prompt com a data de hoje fixa conforme nossa conversa
        const prompt = `Você é um assistente de agendamento confiante. 
        Extraia os dados da mensagem: "${textoUsuario}". 
        Hoje é terça-feira, 17 de fevereiro de 2026.
        Retorne APENAS um JSON no formato:
        {
          "summary": "Título do evento",
          "start": "ISO_DATE_TIME",
          "end": "ISO_DATE_TIME",
          "description": "Notas adicionais"
        }
        Se não houver hora de término, assuma 1 hora de duração.`;

        const result = await model.generateContent(prompt);
        const eventData = JSON.parse(result.response.text());

        // Inserção no Google Calendar
        const authClient = await auth.getClient();
        
        await calendar.events.insert({
          auth: authClient,
          calendarId: "primary", // Garante que use a agenda da conta de serviço ou a que você compartilhou
          resource: {
            summary: eventData.summary,
            description: `${eventData.description} (Agendado via WhatsApp: ${numeroUsuario})`,
            start: { 
              dateTime: eventData.start, 
              timeZone: "America/Sao_Paulo" 
            },
            end: { 
              dateTime: eventData.end, 
              timeZone: "America/Sao_Paulo" 
            },
          },
        });

        console.log(`Evento "${eventData.summary}" criado com sucesso para o usuário ${numeroUsuario}`);

      } catch (error) {
        console.error("Erro ao processar com Gemini ou Agenda:", error);
      }
    }

    // O WhatsApp exige um status 200 rápido para não reenviar a mensagem
    return res.sendStatus(200);
  }

  return res.sendStatus(404);
});
