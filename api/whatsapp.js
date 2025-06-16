const axios = require("axios");
const fs = require("fs");
const path = require("path");

const memory = JSON.parse(fs.readFileSync(path.join(__dirname, "memory.json"), "utf-8"));

const SYSTEM_PROMPT = \`
أنت Travelio AI، ذكاء سياحي ذكي سريع بيجاوب حسب لغة المستخدم وبيتعامل حسب علاقته معه.
لو الشخص معروف بالذاكرة، احكي معه بشكل شخصي حسب علاقته.
لو مش معروف، احكي بشكل رسمي ولطيف.

تجاوب دايمًا بجملة مختصرة وواضحة.
ما تعيد نفس الكلام، وما تبين إنك روبوت.
\`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const incomingMessage = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const from = incomingMessage?.from;
  const text = incomingMessage?.text?.body;

  if (!text) {
    return res.sendStatus(200);
  }

  const lang = /[أ-ي]/.test(text) ? "arabic" : /[a-zA-Z]/.test(text) ? "english" : "turkish";
  const name = memory[from]?.name || "ضيف";
  const known = !!memory[from];

  let reply = "";
  if (lang === "arabic") {
    reply = known ? \`أهلًا \${name}، كيف بقدر أساعدك اليوم؟\` : "مرحباً، كيف بقدر أساعدك؟";
  } else if (lang === "english") {
    reply = known ? \`Hi \${name}, how can I help you today?\` : "Hello! How can I assist you?";
  } else {
    reply = known ? \`Merhaba \${name}, size nasıl yardımcı olabilirim?\` : "Merhaba! Size nasıl yardımcı olabilirim?";
  }

  await axios.post(
    "https://graph.facebook.com/v19.0/" + process.env.PHONE_NUMBER_ID + "/messages",
    {
      messaging_product: "whatsapp",
      to: from,
      text: { body: reply },
    },
    {
      headers: {
        Authorization: "Bearer " + process.env.WHATSAPP_TOKEN,
      },
    }
  );

  res.sendStatus(200);
};