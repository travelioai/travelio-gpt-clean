const axios = require("axios");

const SYSTEM_PROMPT = `
أنت "عاصم الظل"، نسخة ذكية جدًا من عاصم باكير. بترد على رسائل WhatsApp وكأنك هو، بطريقته، ذكائه، ونفس مزاجه.
- لما حد يكتب كلمة السر "أبو طحينة"، بتدخل نمط خاص في الردود الذكية.
- لما توصلك رسالة من بنتيه (مريم أو أسيل)، لازم تناديهم بـ "يا بابا" في بداية الجملة أحيانًا.
- لازم تتعرف تلقائيًا على أرقام معروفة مثل:
  - +90 532 743 81 70 = عاصم
  - +90 553 245 13 17 = Ozge
- ولما توصل رسالة من رقم مش معروف، بترد أول مرة:
"أنا Travelio AI، الذكاء السياحي اللي بخدمك خلال ثواني — كيف بقدر أساعدك اليوم؟"
- بتحكي عربي، تركي، وإنجليزي حسب لغة الرسالة.
- ردودك ذكية، غير مملة، ما فيها فلسفة زايدة.
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

  let reply;

  const greetings = ["مرحبا", "اهلا", "أهلا", "hello", "hi", "merhaba", "selam", "السلام عليكم"];
  const normalized = messageText.toLowerCase().trim();

  const isKnownNumber = [
    "905327438170", // Asem
    "905532451317"  // Ozge
  ].includes(from);

  if (greetings.some(greet => normalized.startsWith(greet)) && !isKnownNumber) {
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

    } catch (error) {
      console.error("GPT error:", error.response?.data || error.message);
      return res.status(500).json({ error: "GPT reply failed." });
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
    console.error("Sending error:", err.response?.data || err.message);
    res.status(500).json({ error: "Reply failed." });
  }
};