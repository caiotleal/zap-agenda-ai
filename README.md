# zap-agenda-ai

Webhook em Firebase Functions para receber mensagens do WhatsApp, extrair dados de agendamento com Gemini e criar eventos no Google Calendar.

## Configuração

1. Instale dependências das functions:
   ```bash
   cd functions
   npm install
   ```
2. Configure variáveis de ambiente no Firebase:
   - `GEMINI_API_KEY`
   - `WHATSAPP_VERIFY_TOKEN`
3. Faça o deploy:
   ```bash
   firebase deploy --only functions
   ```

## Endpoint

A função publicada é `whatsappWebhook` e aceita:

- `GET`: validação de webhook da Meta (`hub.mode`, `hub.verify_token`, `hub.challenge`).
- `POST`: processamento da mensagem recebida e criação de evento na agenda.
