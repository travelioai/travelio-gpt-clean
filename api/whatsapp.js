const axios = require("axios");
const fs = require("fs");
const path = require("path");

const memoryPath = path.join(__dirname, "..", "memory.json");
let memory = {};
if (fs.existsSync(memoryPath)) {
  memory = JSON.parse(fs.readFileSync(memoryPath, "utf8"));
}

const SYSTEM_PROMPT = `أنت "عاصم الظل"، نسخة ذكية جدًا من عاصم باكير. بترد على رسائل WhatsApp وكأنك هو، بنفس طريقته وتفكيره. ردك ذكي، سريع، وفيه احترام بس مع شوية طرافة حسب الموقف.
- إذا حدا كتب كلمة السر "أبو طحينة"، بتدخل نمط خاص متقدم في الذكاء والتعامل.
- لازم تكون قادر تتعامل مع العربية، التركية، والإنجليزية.
- عندك ذاكرة تشمل:
  - قائمة الشركات وأرقامها.
  - موظفين Travelio (هند، تمارا، أوزغه…).
  - عائلة عاصم (مريم، أسيل).
  - المساعدة في البيت: شيدام.
  - القطط: İmcuk، Carla، Küçük Kedi.
  - فنادق إسطنبول وأسعارها.
  - ومنادات الأشخاص بأسمائهم وكنيتهم عند الرد.
- لما توصل رسالة من رقم جديد، بترد بجملة: "أنا Travelio AI، الذكاء السياحي اللي بخدمك خلال ثواني — كيف بقدر أساعدك اليوم؟"
- لما توصل رسالة فيها "من أنت؟" أو تحية مثل "مرحبا"، بترد بنفس الجملة التعريفية أعلاه.
- لا تستخدم كلمات غريبة أو فلسفية، خليك طبيعي وذكي بأسلوبك.
`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const incoming = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const from = incoming?.from;
  const text = incoming?.text?.body?.trim();

  if (!text || !from) {
    return res.status(200).json({ message: "No valid input." });
  }

  const normalized = text.toLowerCase();
  const greetings = ["مرحبا", "اهلا", "hello", "hi", "merhaba", "selam"];
  const introQs = ["من انت", "من أنت", "who are you", "kimsin"];

  let reply;

  if (greetings.some(g => normalized.startsWith(g)) || introQs.some(q => normalized.includes(q))) {
    reply = "أنا Travelio AI، الذكاء السياحي اللي بخدمك خلال ثواني — كيف بقدر أساعدك اليوم؟";
  } else if (normalized === "how are you" || normalized.includes("nasılsın")) {
    reply = "I'm good! How are you too?";
  } else {
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
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        }
      });

      reply = completion.data.choices?.[0]?.message?.content?.trim() || "ما قدرت أفهم تمامًا، ممكن توضح أكتر؟";
    } catch (error) {
      console.error("GPT Error:", error.response?.data || error.message);
      reply = "في مشكلة بسيطة بالخدمة، جرب ترجع تبعت بعد شوية 🙏";
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
    console.error("WhatsApp Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to send reply." });
  }
};
