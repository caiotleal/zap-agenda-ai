const { onRequest } = require("firebase-functions/v2/https");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { google } = require("googleapis");

const TIME_ZONE = "America/Sao_Paulo";
const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const calendar = google.calendar("v3");
const auth = new google.auth.GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/calendar"],
});

function buildPrompt(userText) {
  const today = new Date().toLocaleDateString("pt-BR", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `Você é um assistente de agendamento confiável.
Extraia os dados da mensagem: "${userText}".
Hoje é ${today}.
Retorne APENAS um JSON no formato:
{
  "summary": "Título do evento",
  "start": "ISO_DATE_TIME",
  "end": "ISO_DATE_TIME",
  "description": "Notas adicionais"
}
Se não houver hora de término, assuma 1 hora de duração.`;
}

function parseEventData(rawText) {
  try {
    const parsed = JSON.parse(rawText);
    const hasRequiredFields = parsed?.summary && parsed?.start && parsed?.end;

    if (!hasRequiredFields) {
      throw new Error("Resposta do modelo sem campos obrigatórios.");
    }

    return {
      summary: String(parsed.summary),
      start: String(parsed.start),
      end: String(parsed.end),
      description: parsed.description ? String(parsed.description) : "",
    };
  } catch (error) {
    throw new Error(`Não foi possível interpretar o JSON retornado pelo Gemini: ${error.message}`);
  }
}

async function createCalendarEvent(eventData, phoneNumber) {
  const authClient = await auth.getClient();

  await calendar.events.insert({
    auth: authClient,
    calendarId: "primary",
    resource: {
      summary: eventData.summary,
      description: `${eventData.description} (Agendado via WhatsApp: ${phoneNumber})`.trim(),
      start: {
        dateTime: eventData.start,
        timeZone: TIME_ZONE,
      },
      end: {
        dateTime: eventData.end,
        timeZone: TIME_ZONE,
      },
    },
  });
}

exports.whatsappWebhook = onRequest(async (req, res) => {
  if (!GEMINI_API_KEY) {
    console.error("Configuração ausente: GEMINI_API_KEY não definida.");
    return res.status(500).send("Configuração do servidor incompleta.");
  }

  switch (req.method) {
    case "GET": {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      if (!WEBHOOK_VERIFY_TOKEN) {
        console.error("Configuração ausente: WHATSAPP_VERIFY_TOKEN não definida.");
        return res.sendStatus(500);
      }

      if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
        console.log("Webhook validado com sucesso.");
        return res.status(200).send(challenge);
      }

      return res.sendStatus(403);
    }

    case "POST": {
      const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      const userText = message?.text?.body;
      const phoneNumber = message?.from;

      if (!userText || !phoneNumber) {
        return res.sendStatus(200);
      }

      try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash",
          generationConfig: { responseMimeType: "application/json" },
        });

        const prompt = buildPrompt(userText);
        const result = await model.generateContent(prompt);
        const eventData = parseEventData(result.response.text());

        await createCalendarEvent(eventData, phoneNumber);

        console.log(`Evento "${eventData.summary}" criado para o usuário ${phoneNumber}.`);
      } catch (error) {
        console.error("Erro ao processar mensagem do WhatsApp:", error);
      }

      return res.sendStatus(200);
    }

    default:
      return res.sendStatus(404);
  }
});
