import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).send("👋 Webhook is running");
  }

  if (req.method !== 'POST') {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    const message = changes?.messages?.[0];
    const wa_id = message?.from;
    const userMessage = message?.text?.body;

    if (!userMessage || !wa_id) {
      return res.status(400).send("Invalid request");
    }

    // Get reply from OpenAI
    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: userMessage }]
      })
    });

    const gptData = await gptResponse.json();
    const replyText = gptData.choices?.[0]?.message?.content || "ما فهمت، عيدها مرة ثانية 🙏";

    // Send reply back to WhatsApp
    await fetch(`https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: wa_id,
        text: { body: replyText }
      })
    });

    return res.status(200).send("Message sent to WhatsApp");

  } catch (error) {
    console.error("🔥 Error:", error);
    return res.status(500).send("Internal Server Error");
  }
}