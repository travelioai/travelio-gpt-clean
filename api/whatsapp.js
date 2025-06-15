const axios = require("axios");
const fs = require("fs");
const path = require("path");

const memoryPath = path.join(__dirname, "memory.json");
const memory = JSON.parse(fs.readFileSync(memoryPath, "utf-8"));

const SYSTEM_PROMPT = `
أنت Travelio AI، ذكاء سياحي راقٍ.
- لا تكشف عن معلومات حساسة أو شخصية لأي شخص.
- لا تعطي تفاصيل عن عاصم باكير إلا إذا استخدمت كلمة السر "أبو طحينة".
- ردودك ذكية، موجزة، وتتبدل حسب لغة المستخدم (عربي، تركي، إنجليزي).
- انتبه للسياق دائماً، واذكر فقط ما هو مناسب.
`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const incomingMessage = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const messageText = incomingMessage?.text?.body;
  const from = incomingMessage?.from;

  if (!messageText || !from) {
    return res.status(200).send("No message content.");
  }

  let reply = "I'm here to assist you.";

  if (messageText.toLowerCase().includes("how are you")) {
    reply = "I'm good! How are you too?";
  } else if (["من انت", "who are you", "kimsin"].some(q => messageText.toLowerCase().includes(q))) {
    reply = "أنا Travelio AI، مساعدك السياحي الذكي. كيف بقدر أساعدك؟";
  } else if (messageText.includes("أبو طحينة")) {
    reply = "أهلاً فيك... عاصم الظل جاهز، كيف فيني أخدمك اليوم؟";
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

  res.send("Done");
};

