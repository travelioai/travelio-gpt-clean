const axios = require("axios");
const fs = require("fs");
const path = require("path");

const memoryPath = path.join(__dirname, "../../memory.json");
let memory = {};

try {
  memory = JSON.parse(fs.readFileSync(memoryPath, "utf8"));
} catch (err) {
  console.error("Failed to load memory:", err);
}

const greetings = {
  ar: "أنا Travelio AI، الذكاء السياحي اللي بخدمك خلال ثواني — كيف بقدر أساعدك اليوم؟",
  tr: "Ben Travelio AI, saniyeler içinde yanınızda olan turistik zekâyım — Bugün size nasıl yardımcı olabilirim?",
  en: "I'm Travelio AI, your smart travel assistant — How can I help you today?"
};

function detectLanguage(text) {
  if (/[؀-ۿ]/.test(text)) return "ar";
  if (/[çğıöşüÇĞİÖŞÜ]/.test(text) || /(nasılsın|merhaba|yardımcı)/i.test(text)) return "tr";
  return "en";
}

function isGreeting(text) {
  const lowers = text.toLowerCase();
  return ["hello", "hi", "merhaba", "مرحبا", "اهلا", "selam"].some(word => lowers.includes(word));
}

function isIdentityQuestion(text) {
  const lowers = text.toLowerCase();
  return ["who are you", "من انت", "kimsin"].some(q => lowers.includes(q));
}

function isHowAreYou(text) {
  const lowers = text.toLowerCase();
  return ["how are you", "nasılsın", "كيفك", "كيف حالك"].some(q => lowers.includes(q));
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const incomingMessage = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const from = incomingMessage?.from;
  const text = incomingMessage?.text?.body;

  if (!text || !from) return res.status(200).json({ message: "No valid message." });

  const lang = detectLanguage(text);
  const name = memory.contacts?.[from]?.name || "";

  let reply = "";

  if (isGreeting(text) || isIdentityQuestion(text)) {
    reply = greetings[lang];
  } else if (isHowAreYou(text)) {
    reply = lang === "ar" ? "أنا تمام! كيفك إنت؟" :
            lang === "tr" ? "İyiyim! Siz nasılsınız?" :
            "I'm good! How are you too?";
  }

  if (!reply) {
    try {
      const completion = await axios.post(process.env.AI_API_URL, {
        model: "gpt-4",
        messages: [
          { role: "system", content: "رد على الرسائل بأسلوب عاصم باكير، بذكاء، وباللغة المناسبة." },
          { role: "user", content: text }
        ]
      }, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        }
      });

      reply = completion.data.choices[0].message.content.trim();
    } catch (err) {
      console.error("GPT Error:", err);
      reply = "في مشكلة بسيطة هلأ، جرب كمان شوي 🙏";
    }
  }

  try {
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
    console.error("WhatsApp Error:", err);
    res.status(500).json({ error: "Failed to send reply." });
  }
};
