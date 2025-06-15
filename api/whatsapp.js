import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

router.post('/', async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    const message = changes?.messages?.[0];
    const wa_id = message?.from;
    const userMessage = message?.text?.body;

    if (!userMessage || !wa_id) {
      return res.sendStatus(400);
    }

    // Get response from OpenAI
    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: userMessage }]
      })
    });

    const gptData = await gptRes.json();
    const reply = gptData.choices?.[0]?.message?.content || "ما فهمت سؤالك، ممكن تعيد؟";

    // Send message back to WhatsApp
    await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: wa_id,
        text: { body: reply }
      })
    });

    return res.sendStatus(200);
  } catch (error) {
    console.error("🔥 ERROR:", error);
    return res.status(500).send("Internal Server Error");
  }
});

export default router;