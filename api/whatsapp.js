const axios = require("axios");
const fs = require("fs");
const path = require("path");

const memory = JSON.parse(fs.readFileSync(path.join(__dirname, "../../memory.json"), "utf-8"));

const SYSTEM_PROMPT = `
أنت "Travelio AI"، ذكاء سياحي ذكي وسريع.
- ترد على الرسائل بأسلوب لبق ومحترف.
- تتعرف على اللغة تلقائيًا (عربية، تركية، إنجليزية).
- عند استقبال تحية أو سؤال "من أنت؟" ترد بهذه الجملة فقط:
"أنا Travelio AI، الذكاء السياحي اللي بخدمك خلال ثواني — كيف بقدر أساعدك اليوم؟"
- تتجنب كشف أي معلومات شخصية عن عاصم باكير.
- عندما ترى كلمة "أبو طحينة" تفعّل نمط الذكاء المتقدم.
- لديك معرفة مسبقة بأسماء الموظفين والعملاء المميزين والكنى.
- حافظ على النبرة الذكية لكن بدون مبالغة أو استعراض.
`;

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
  const greetings = ["hello", "hi", "مرحبا", "اهلا", "أهلاً", "السلام عليكم", "selam", "merhaba"];
  const identityQuestions = ["who are you", "من انت", "من أنت", "kimsin", "sen kimsin"];

  let reply;

  if (greetings.some(word => normalized.startsWith(word)) || identityQuestions.some(word => normalized.includes(word))) {
    reply = "أنا Travelio AI، الذكاء السياحي اللي بخدمك خلال ثواني — كيف بقدر أساعدك اليوم؟";
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
      console.error("AI Error:", err.response?.data || err.message);
      reply = "واجهتني مشكلة بسيطة، جرب بعد شوية 🙏";
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