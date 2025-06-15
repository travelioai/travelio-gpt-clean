import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    console.log("🔔 Incoming request method:", req.method);
    const body = req.body;
    console.log("📩 Webhook payload:", JSON.stringify(body, null, 2));

    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const wa_id = message?.from;
    const userMessage = message?.text?.body;

    if (!userMessage || !wa_id) {
      console.log("⚠️ No valid message or sender found");
      return res.sendStatus(400);
    }

    // Get reply from GPT
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
    const reply = gptData.choices?.[0]?.message?.content || "ما فهمت قصدك، ممكن توضح؟";

    console.log("🤖 GPT Raw Response:", JSON.stringify(gptData, null, 2));

    // Send reply to WhatsApp
    const whatsappRes = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
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

    const waData = await whatsappRes.json();
    console.log("📤 WhatsApp Send Result:", JSON.stringify(waData, null, 2));

    return res.sendStatus(200);
  } catch (err) {
    console.error("🔥 ERROR:", err);
    return res.status(500).send("Internal Server Error");
  }
}