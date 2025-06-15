import express from 'express';
const router = express.Router();
const fetch = require("node-fetch");
import dotenv from 'dotenv';
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

router.post("/", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    const message = changes?.messages?.[0];
    const wa_id = message?.from;
    const userMessage = message?.text?.body;

    if (!userMessage || !wa_id) {
      return res.sendStatus(400);
    }

    // Send user message to OpenAI
    const gptResponseRaw = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4-0613",
        messages: [{ role: "user", content: userMessage }]
      })
    });

    const gptData = await gptResponseRaw.json();
    const gptReply = gptData?.choices?.[0]?.message?.content?.trim();

    if (!gptReply) {
      console.error("No reply from GPT:", gptData);
      return res.sendStatus(500);
    }

    // Send GPT reply to WhatsApp
    const waResponse = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: wa_id,
        text: { body: gptReply }
      })
    });

    if (!waResponse.ok) {
      const errorData = await waResponse.json();
      console.error("WhatsApp API error:", errorData);
      return res.sendStatus(500);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Fatal error:", err);
    res.sendStatus(500);
  }
});

module.exports = router;