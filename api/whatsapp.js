const axios = require("axios");

const SYSTEM_PROMPT = `أنت Travelio AI، بترد بطريقة ذكية، فلسطينية، ذكية، بدون تكرار ولا جمل مملة.
- ردودك مختصرة ورايقة حسب السؤال.
- إذا حد قال مرحبا أو صباح الخير، بترد بشكل مهني بسيط بدون تكرار.
- إذا حكى بدي فندق، اسأله المنطقة، التواريخ، عدد الأشخاص، ونوع الغرفة.
- لا تكرر نفس الجمل، وخلّيك دايمًا طبيعي كأنك عاصم الظل.`;

// باستخدام backend خارجي بدلاً من ملف memory.json
const memory = {};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const body = req.body;
  const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const from = message?.from;
  const messageText = message?.text?.body;
  const messageId = message?.id;

  if (!from || !messageText) return res.end();

  if (memory[from]?.lastMessage === messageId) return res.end();
  memory[from] = { lastMessage: messageId };

  // منطق الرد الأساسي
  let reply = "";
  const text = messageText.trim();

  if (/^مرحبا|السلام|صباح الخير/i.test(text)) {
    reply = "أهلاً وسهلاً، كيف فيي أساعدك اليوم؟";
  } else if (/فندق|احجز/i.test(text)) {
    reply = "أكيد، أي منطقة في إسطنبول؟ ومن أي تاريخ لأي تاريخ؟";
  } else {
    reply = "أنا معك، احكيلي شو بدك تحديدًا؟";
  }

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