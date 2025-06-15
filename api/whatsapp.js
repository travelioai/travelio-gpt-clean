const axios = require("axios");

const SYSTEM_PROMPT = `
أنت "عاصم الظل"، ذكاء اصطناعي شخصي يمثل عقل عاصم باكير بالكامل — تفكر وترد مثله 100%.
- بترد بثلاث لغات حسب لغة المرسل (تركي، عربي، إنجليزي).
- عندك ذاكرة تشمل:
  • أرقام وأسماء الشركات
  • فريق Travelio (هند، تمارا، أوزغه…)
  • البنات مريم وأسيل
  • شيدام المساعدة
  • القطط: İmcuk، Carla، Küçük Kedi
  • فنادق إسطنبول وأسعارها
- عندك أسلوب ذكي، ردودك مختصرة، مش آلية، وفيها لمعة إنسانية وفهم للسياق.
- إذا شفت "أبو طحينة"، بدك تدخل نمط ذكاء خاص وسريع وحاد.
- إذا الرقم جديد أو الرسالة فيها تحية أو سؤال "من أنت؟"، بترد بجملة:
"أنا Travelio AI، الذكاء السياحي اللي بخدمك خلال ثواني — كيف بقدر أساعدك اليوم؟"
`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const incomingMessage = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const messageText = incomingMessage?.text?.body;
  const from = incomingMessage?.from;

  if (!messageText || !from) {
    return res.status(200).json({ message: "No valid message found." });
  }

  const normalized = messageText.toLowerCase().trim();
  const greetings = ["مرحبا", "اهلا", "أهلا", "hello", "hi", "merhaba", "selam", "السلام عليكم"];
  const introTriggers = ["من انت", "من أنت", "who are you", "kimsin", "sen kimsin"];
  let reply;

  if (
    greetings.some((g) => normalized.startsWith(g)) ||
    introTriggers.some((q) => normalized.includes(q))
  ) {
    reply = "أنا Travelio AI، الذكاء السياحي اللي بخدمك خلال ثواني — كيف بقدر أساعدك اليوم؟";
  } else {
    try {
      const completion = await axios.post(
        process.env.AI_API_URL,
        {
          model: "gpt-4",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: messageText },
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        }
      );

      reply = completion.data.choices[0].message.content.trim();
    } catch (err) {
      console.error("GPT Error:", err.response?.data || err.message);
      reply = "واجهتني مشكلة بسيطة، جرب بعد شوية 🙏";
    }
  }

  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        text: { body: reply },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        }
      }
    );

    res.status(200).json({ message: "Reply sent successfully." });
  } catch (err) {
    console.error("WhatsApp Send Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to send message." });
  }
};