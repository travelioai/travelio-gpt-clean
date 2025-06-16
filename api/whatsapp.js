const axios = require("axios");
const fs = require("fs");
const path = require("path");

const memoryPath = path.join(__dirname, "memory.json");
const memory = JSON.parse(fs.readFileSync(memoryPath, "utf8"));

const SYSTEM_PROMPT = `
أنت Travelio AI – ذكاء سياحي ذكي بيجاوب بطريقتي الفلسطينية.
خليك دايمًا ذكي، دقيق، وسياقي، وبدون تكرار ممل.`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const body = req.body;
  const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const from = message?.from;
  const messageText = message?.text?.body;

  if (!message || !from || !messageText) {
    return res.end(); // تجاهل الرسائل الفارغة أو غير النصية
  }

  if (memory.lastMessage === message.id) {
    return res.end(); // تجاهل التكرار
  }

  memory.lastMessage = message.id;
  fs.writeFileSync(memoryPath, JSON.stringify(memory));

  const reply = `أهلاً، كيف فيني أساعدك اليوم؟`;

  await axios.post(
    `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to: from,
      text: { body: reply },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  res.end("ok");
};
