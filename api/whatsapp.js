const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

export default async function handler(req, res) {
  console.log("🔔 Incoming request method:", req.method);

  if (req.method === 'GET') {
    const verifyToken = 'travelio-secret';
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token === verifyToken) {
      console.log("✅ Webhook verified");
      return res.status(200).send(challenge);
    } else {
      console.log("❌ Webhook verification failed");
      return res.status(403).send('Verification failed');
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      console.log("📩 Webhook payload:", JSON.stringify(body, null, 2));

      const messageText = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body;
      const senderNumber = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
      const phoneNumberId = body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

      console.log("📨 Message text:", messageText);
      console.log("📱 Sender number:", senderNumber);

      if (!messageText || !senderNumber || !phoneNumberId) {
        console.log("⚠️ Missing data");
        return res.status(200).end();
      }

      const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{ role: "user", content: messageText }]
        })
      });

      const gptData = await gptResponse.json();
      const reply = gptData.choices?.[0]?.message?.content || "ما فهمت عليك، ممكن تعيد؟";

      console.log("🤖 GPT reply:", reply);

      // 🟢 Send reply to WhatsApp
      const whatsappRes = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: senderNumber,
          text: { body: reply }
        })
      });

      const whatsappData = await whatsappRes.json();
      console.log("📤 WhatsApp API response:", JSON.stringify(whatsappData, null, 2));

      return res.status(200).end();
    } catch (error) {
      console.error("🔥 Error:", error);
      return res.status(500).send("Internal Server Error");
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}