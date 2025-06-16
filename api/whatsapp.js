const axios = require("axios");
let lastMessageId = null;

const SYSTEM_PROMPT = `
أنت Travelio AI – الذكاء السياحي. ردك دايمًا يكون ذكي، واضح، وسلس بدون تكرار أو مجاملات طويلة. إذا المستخدم قال "مرحبا" أو "صباح الخير"، رد عليه بشكل بشري سريع، وإذا سأل عن حجز، خليك مباشر وبلّش بجمع التفاصيل. لا تعيد نفس الجمل.
`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const body = req.body;
  const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const from = message?.from;
  const messageText = message?.text?.body;

  if (!message || !from || !messageText) {
    return res.end(); // رسائل ناقصة أو غير قابلة للمعالجة
  }

  if (lastMessageId === message.id) {
    return res.end(); // تجاهل التكرار
  }
  lastMessageId = message.id;

  const reply = `مرحبا، كيف فيني أساعدك اليوم؟`; // سيتم استبداله برد ديناميكي

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