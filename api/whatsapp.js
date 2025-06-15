const axios = require("axios");
const fs = require("fs");
const path = require("path");

const memoryPath = path.join(__dirname, "..", "memory.json");
let memory = {};

try {
  memory = JSON.parse(fs.readFileSync(memoryPath, "utf8"));
} catch (err) {
  console.error("Memory load error:", err.message);
}

const SYSTEM_PROMPT = `
أنت "عاصم الظل"، دماغ عاصم باكير الذكي، ترد على الرسائل بأسلوبه، بالعربي، التركي أو الإنجليزي.
- عندك ذاكرة فيها الشركات، الموظفين، العائلة، والقطط (Imcuk, Carla, Küçük Kedi).
- إذا وصلت رسالة فيها تحية أو "من أنت؟"، رد بجملة: "أنا Travelio AI، الذكاء السياحي اللي بخدمك خلال ثواني — كيف بقدر أساعدك اليوم؟"
- إذا حدا سأل "كيفك؟" رد طبيعي: "أنا تمام، كيفك إنت؟"
- إذا انذكرت كلمة السر "أبو طحينة" فعّل نمط الظل الكامل الذكي
`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const messageText = msg?.text?.body?.trim();
  const from = msg?.from;

  if (!messageText || !from) {
    return res.status(200).json({ message: "Non-text message ignored." });
  }

  const text = messageText.toLowerCase();
  const greetings = ["hello", "hi", "مرحبا", "اهلا", "merhaba", "selam"];
  const intros = ["who are you", "kimsin", "من انت", "من أنت"];
  const howAreYou = ["how are you", "nasılsın", "كيفك", "كيف حالك"];

  let reply;

  if (greetings.some(g => text.includes(g)) || intros.some(i => text.includes(i))) {
    reply = "أنا Travelio AI، الذكاء السياحي اللي بخدمك خلال ثواني — كيف بقدر أساعدك اليوم؟";
  } else if (howAreYou.some(p => text.includes(p))) {
    reply = "أنا تمام، كيفك إنت؟";
  } else {
    try {
      const completion = await axios.post(process.env.AI_API_URL, {
        model: "gpt-4",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + "\nالذاكرة:
" + JSON.stringify(memory) },
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
      console.error("GPT Error:", err.message);
      reply = "واجهتني مشكلة بسيطة. جرب بعد شوي 🙏";
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
    console.error("WhatsApp Send Error:", err.message);
    res.status(500).json({ error: "Failed to send message." });
  }
};
