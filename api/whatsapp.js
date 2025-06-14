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
      console.log("📨 Message text:", messageText);

      if (!messageText) {
        console.log("⚠️ No message found");
        return res.status(200).json({ reply: "ما في رسالة واضحة" });
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
      console.log("🤖 GPT Raw Response:", JSON.stringify(gptData, null, 2));

      const reply = gptData.choices?.[0]?.message?.content || "ما فهمت عليك، ممكن تعيد؟";

      return res.status(200).json({ reply });
    } catch (error) {
      console.error("🔥 GPT Error:", error);
      return res.status(500).send("GPT Server Error");
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  console.log("⛔ Method Not Allowed:", req.method);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}mport fetch from 'node-fetch';

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
      console.log("📨 Message text:", messageText);

      if (!messageText) {
        console.log("⚠️ No message found");
        return res.status(200).json({ reply: "ما في رسالة واضحة" });
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
      console.log("🤖 GPT Raw Response:", JSON.stringify(gptData, null, 2));

      const reply = gptData.choices?.[0]?.message?.content || "ما فهمت عليك، ممكن تعيد؟";

      return res.status(200).json({ reply });
    } catch (error) {
      console.error("🔥 GPT Error:", error);
      return res.status(500).send("GPT Server Error");
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  console.log("⛔ Method Not Allowed:", req.method);
 import fetch from 'node-fetch';

export default async function handler(req, res) {
  console.log("🔔 Incoming request method:", req.method);

  if (req.method === 'GET') {
    const verifyToken = 'travelio-secret';
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log("🧪 Verification Request:", { mode, token, challenge });

    if (mode && token === verifyToken) {
      console.log("✅ Verification passed");
      return res.status(200).send(challenge);
    } else {
      console.log("❌ Verification failed");
      return res.status(403).send('Verification failed');
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      console.log("📩 Raw Webhook Payload:", JSON.stringify(body, null, 2));

      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;
      const messageText = messages?.[0]?.text?.body;

      console.log("🧠 Extracted message text:", messageText);

      if (!messageText) {
        console.log("⚠️ No message text found.");
        return res.status(200).json({ reply: "ما تم العثور على رسالة نصية." });
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
      })
;Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      const gptData = await gptResponse.json();
      console.log("📦 GPT Raw Response:", JSON.stringify(gptData, null, 2));

      const reply = gptData.choices?.[0]?.message?.content || "ما قدرت أفهم سؤالك، ممكن تعيده؟";
      console.log("✅ Final Reply from GPT:", reply);

      return res.status(200).json({ reply });
    } catch (error) {
      console.error("🔥 GPT Error (caught):", error);
      return res.status(500).send("Internal Server Error from GPT");
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  console.log("⛔ Method Not Allowed:", req.method);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}


