const axios = require("axios");

let lastMessages = new Map(); // لحفظ آخر رسالة لكل مستخدم مؤقتًا

const SYSTEM_PROMPT = `
أنت Travelio AI، ذكاء سياحي ذكي بيجاوب بطريقة فلسطينية ذكية، نغمتك حيوية ومش مملة.
`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const body = req.body;
  const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const from = message?.from;
  const messageText = message?.text?.body;
  const messageId = message?.id;

  if (!messageText || !from) return res.end(); // حماية من الفراغ أو الأخطاء

  // منع التكرار المؤقت داخل الجلسة
  if (lastMessages.get(from) === messageId) return res.end();
  lastMessages.set(from, messageId);

  let reply = "أهلاً، كيف فيني أساعدك اليوم؟";

  // تبديل ذكي حسب اللغة
  if (messageText.match(/[a-zA-Z]/)) {
    reply = "Hello! How can I assist you today?";
  } else if (messageText.match(/[ğüşöçİıĞÜŞÖÇ]/i)) {
    reply = "Merhaba! Size nasıl yardımcı olabilirim?";
  }

  // إرسال الرد
  await axios.post(
    `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to: from,
      text: { body: reply }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );

  res.end("ok");
};