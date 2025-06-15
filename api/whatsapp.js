const axios = require("axios");
const fs = require("fs");
const path = require("path");
const memoryPath = path.join(__dirname, "..", "memory.json");

let memory = {};
try {
  const data = fs.readFileSync(memoryPath, "utf8");
  memory = JSON.parse(data);
} catch (error) {
  console.error("Failed to load memory:", error);
}

function detectLanguage(text) {
  if (/^[a-zA-Z0-9\s.,!?'"(){}[\]@#$%^&*+-=]*$/.test(text)) return "en";
  if (/[أ-ي]/.test(text)) return "ar";
  if (/[çğıöşüÇĞİÖŞÜ]/.test(text)) return "tr";
  return "ar";
}

function getGreetingReply(lang) {
  const greetings = {
    ar: "أنا Travelio AI، الذكاء السياحي اللي بخدمك خلال ثواني — كيف بقدر أساعدك اليوم؟",
    tr: "Ben Travelio AI, saniyeler içinde hizmet veren turistik zekân. Size nasıl yardımcı olabilirim?",
    en: "I'm Travelio AI, the travel assistant that helps you in seconds — how can I assist you today?",
  };
  return greetings[lang] || greetings.ar;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const text = msg?.text?.body;
  const from = msg?.from;

  if (!text || !from) return res.status(200).json({ message: "No text message." });

  const normalized = text.toLowerCase().trim();
  const lang = detectLanguage(normalized);

  const greetings = ["hello", "hi", "مرحبا", "اهلا", "merhaba", "selam", "السلام عليكم"];
  const identityQs = ["who are you", "من انت", "من أنت", "kimsin", "sen kimsin"];

  let reply = "";

  if (greetings.includes(normalized) || identityQs.includes(normalized)) {
    reply = getGreetingReply(lang);
  } else if (normalized.includes("how are you")) {
    reply = "I'm good! How are you too?";
  } else {
    // تهيئة البرومبت الديناميكي مع الذاكرة
    const SYSTEM_PROMPT = \`أنت "عاصم الظل"، نسخة ذكية من عاصم باكير. ردك حسب معلومات الذاكرة التالية:
\${JSON.stringify(memory)}\`;

    try {
      const completion = await axios.post(process.env.AI_API_URL, {
        model: "gpt-4",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text }
        ]
      }, {
        headers: {
          "Content-Type": "application/json",
          Authorization: \`Bearer \${process.env.OPENAI_API_KEY}\`
        }
      });

      reply = completion.data.choices[0].message.content.trim();
    } catch (error) {
      console.error("OpenAI error:", error.response?.data || error.message);
      reply = lang === "ar" ? "واجهتني مشكلة، جرب بعد شوي 🙏" :
              lang === "tr" ? "Bir sorun oluştu, lütfen tekrar deneyin 🙏" :
              "Something went wrong, please try again 🙏";
    }
  }

  try {
    await axios.post(\`https://graph.facebook.com/v19.0/\${process.env.PHONE_NUMBER_ID}/messages\`, {
      messaging_product: "whatsapp",
      to: from,
      text: { body: reply }
    }, {
      headers: {
        "Content-Type": "application/json",
        Authorization: \`Bearer \${process.env.WHATSAPP_TOKEN}\`
      }
    });

    res.status(200).json({ message: "Reply sent." });
  } catch (err) {
    console.error("WhatsApp error:", err.response?.data || err.message);
    res.status(500).json({ error: "Reply failed to send." });
  }
};

