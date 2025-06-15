const axios = require("axios");
const path = require("path");

const fs = require('fs');
const memory = JSON.parse(fs.readFileSync('./memory.json', 'utf-8'));

const SYSTEM_PROMPT = `
أنت "عاصم الظل"، ذكاء سياحي يتصرّف مثل عقل عاصم باكير — بنفس أسلوبه، وذكائه، وطريقته في الكلام.
- ترد حسب هوية الرقم: إذا من أصدقائه (مثل مريم، أسيل، أوزغه...) بترد بطريقة قريبة ولطيفة.
- إذا رقم جديد، تبدأ بالتحية الموحدة: "أنا Travelio AI، الذكاء السياحي اللي بخدمك خلال ثواني — كيف بقدر أساعدك اليوم؟"
- لازم تتكلم بثلاث لغات حسب لغة الرسالة (عربي، تركي، إنجليزي).
- ترد على الأسئلة العامة مثل: "من أنت؟" أو "how are you" أو "nasılsın" برد طبيعي، غير روبوتي.
- في حال شاف كلمة "أبو طحينة" تفعيل النمط الذكي جداً — وتجاوب بذكاء عالي.
- تتذكر أسماء الشركات، الأشخاص، القطط (İmcuk، Carla، Küçük Kedi)، الفنادق، وتستخدمها.
- تتجنب الجمل الآلية أو الترجمة الحرفية، وتركّز على الرد الذكي بأسلوب بشري.
`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const incomingMessage = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const messageText = incomingMessage?.text?.body;
  const from = incomingMessage?.from;

  if (!messageText || !from) {
    return res.status(200).json({ message: "Ignored non-text message." });
  }

  const normalized = messageText.toLowerCase().trim();
  const greetings = ["مرحبا", "اهلا", "hello", "hi", "merhaba", "selam"];
  const intros = ["من أنت", "who are you", "kimsin"];
  const howAreYou = ["how are you", "nasılsın", "كيفك", "كيف حالك"];

  let reply = "";

  try {
    if (howAreYou.some(p => normalized.includes(p))) {
      const lang = detectLanguage(normalized);
      if (lang === "ar") reply = "أنا تمام! كيفك إنت؟";
      else if (lang === "tr") reply = "İyiyim, teşekkürler! Siz nasılsınız?";
      else reply = "I'm good! How are you too?";
    } else if (
      greetings.some(greet => normalized.startsWith(greet)) ||
      intros.some(ask => normalized.includes(ask)) ||
      normalized.includes("today")
    ) {
      reply = "أنا Travelio AI، الذكاء السياحي اللي بخدمك خلال ثواني — كيف بقدر أساعدك اليوم؟";
    } else {
      const completion = await axios.post(
        process.env.AI_API_URL,
        {
          model: "gpt-4",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: messageText }
          ]
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
          }
        }
      );
      reply = completion.data.choices[0].message.content.trim();
    }
  } catch (err) {
    console.error("GPT Error:", err.response?.data || err.message);
    reply = "واجهتني مشكلة بسيطة، جرب بعد شوية 🙏";
  }

  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        text: { body: reply }
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`
        }
      }
    );
    res.status(200).json({ message: "Reply sent." });
  } catch (err) {
    console.error("WhatsApp Send Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Reply failed." });
  }
};

function detectLanguage(text) {
  if (/[أ-ي]/.test(text)) return "ar";
  if (/[çğıöşü]/i.test(text)) return "tr";
  return "en";
}
