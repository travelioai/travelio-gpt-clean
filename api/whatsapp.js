const axios = require("axios");
const fs = require("fs");
const path = require("path");

const memory = JSON.parse(fs.readFileSync(path.join(__dirname, "memory.json"), "utf-8"));
let memory = {};

try {
  memory = JSON.parse(fs.readFileSync(memoryPath, "utf-8"));
} catch (err) {
  console.error("Failed to load memory.json:", err.message);
}

const SYSTEM_PROMPT = `
أنت "عاصم الظل"، نسخة ذكية من عاصم باكير. بترد على رسائل WhatsApp وكأنك هو، بأسلوبه وطريقته بالتفكير. لازم تكون قادر ترد بثلاث لغات: العربية، التركية، الإنجليزية — حسب لغة المرسل.
- لما تسألك الناس "من أنت؟" أو تحية عامة، رد بجملة موحدة: "أنا Travelio AI، الذكاء السياحي اللي بخدمك خلال ثواني — كيف بقدر أساعدك اليوم؟"
- لا تعترف ولا تعطي معلومات شخصية عن عاصم باكير إلا لو كلمة السر كانت "أبو طحينة".
- ردودك لازم تكون مختصرة، ذكية، مرنة، ومناسبة للسياق.
`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const incomingMessage = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const messageText = incomingMessage?.text?.body || "";
  const from = incomingMessage?.from;

  if (!messageText || !from) {
    return res.status(200).json({ message: "Ignored non-text message." });
  }

  const normalized = messageText.trim().toLowerCase();
  const greetings = ["مرحبا", "اهلا", "أهلا", "hello", "hi", "merhaba", "selam", "السلام عليكم"];
  const introTriggers = ["من انت", "من أنت", "who are you", "kimsin", "sen kimsin"];
  const howAreYou = ["how are you", "nasılsın", "كيفك", "كيف حالك"];
  let reply;

  try {
    if (greetings.some(g => normalized.startsWith(g)) || introTriggers.some(q => normalized.includes(q))) {
      reply = "أنا Travelio AI، الذكاء السياحي اللي بخدمك خلال ثواني — كيف بقدر أساعدك اليوم؟";
    } else if (howAreYou.some(q => normalized.includes(q))) {
      reply = "أنا تمام! كيفك إنت؟";
    } else {
      const completion = await axios.post(process.env.AI_API_URL, {
        model: "gpt-4",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: messageText }
        ]
      }, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        }
      });

      reply = completion.data.choices[0].message.content.trim();
    }

await axios.post(`https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`, {
  messaging_product: "whatsapp",
  to: from,
  text: { body: reply }
}, {
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`
  }
});

    res.status(200).json({ message: "Reply sent." });
  } catch (err) {
    console.error("Error:", err.message || err);
    res.status(500).json({ error: "Reply failed." });
  }
};
