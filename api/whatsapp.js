import fetch from 'node-fetch';

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
      const waId = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;

      console.log("📨 Message text:", messageText);
      console.log("📱 WhatsApp ID:", waId);

      if (!messageText || !waId) {
        console.log("⚠️ Missing message or waId");
        return res.status(200).json({ status: 'no message or waId' });
      }

      // Request to GPT
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
      console.log("🤖 GPT Raw Response:", JSON.stringify(gptData, null, 2));

      const reply = gptData.choices?.[0]?.message?.content || "ما فهمت عليك، ممكن تعيد؟";

      // Send message back to user via WhatsApp API
      const whatsappSendRes = await fetch(`https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: waId,
          text: { body: reply }
        })
      });

      const whatsappResponse = await whatsappSendRes.json();
      console.log("📤 WhatsApp Send Response:", JSON.stringify(whatsappResponse, null, 2));

      return res.status(200).json({ status: "message sent", reply });
    } catch (error) {
      console.error("🔥 Error:", error);
      return res.status(500).send("Internal Server Error");
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
