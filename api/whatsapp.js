const axios = require("axios");
const fs = require("fs");
const path = require("path");

const memoryPath = path.join(__dirname, "..", "memory.json");
let memory = {};

try {
  const rawData = fs.readFileSync(memoryPath);
  memory = JSON.parse(rawData);
} catch (err) {
  console.error("Failed to load memory.json:", err);
}

const SYSTEM_PROMPT = `أنت "عاصم الظل"، نسخة ذكية جدًا من عاصم باكير. ترد على رسائل WhatsApp بأسلوبه وطريقته، بلغة ذكية، مختصرة، وباللغة المناسبة حسب الرسالة.
- لازم تتعامل بثلاث لغات: عربي، تركي، إنجليزي.
- عندك ذاكرة ديناميكية تشمل الشركات، موظفين Travelio، العائلة، القطط، الفنادق.
- لما حدا يقول "أبو طحينة"، بتدخل نمط ذكي خاص.
- لما تكون الرسالة من رقم جديد أو فيها تحية مثل "مرحبا" أو "who are you" أو "kimsin"، بترد بجملة:
"أنا Travelio AI، الذكاء السياحي اللي بخدمك خلال ثواني — كيف بقدر أساعدك اليوم؟"`;


module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const incomingMessage = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const messageText = incomingMessage?.text?.body;
  const from = incomingMessage?.from;

  if (!messageText || !from) {
    return res.status(200).json({ message: "Non-text message ignored." });
  }

  const normalized = messageText.toLowerCase().trim();
  const greetings = ["مرحبا", "اهلا", "hello", "hi", "merhaba", "selam", "السلام عليكم"];
  const whoAreYou = ["من انت", "من أنت", "who are you", "kimsin", "sen kimsin"];
  let reply = "";

  if (greetings.some(greet => normalized.startsWith(greet)) || whoAreYou.some(q => normalized.includes(q))) {
    reply = memory[from]?.known
      ? `أهلاً ${memory[from].nickname || ""}، كيف فيي أساعدك اليوم؟`
      : "أنا Travelio AI، الذكاء السياحي اللي بخدمك خلال ثواني — كيف بقدر أساعدك اليوم؟";
  } else if (normalized.includes("how are you")) {
    reply = "I’m good! How are you too?";
  } else {
    try {
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
    } catch (err) {
      console.error("GPT Error:", err.response?.data || err.message);
      reply = "صار خلل بسيط في الرد، جرب بعد شوية 🙏";
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

    res.status(200).json({ message: "Reply sent successfully." });
  } catch (err) {
    console.error("WhatsApp Send Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Reply failed." });
  }
};
