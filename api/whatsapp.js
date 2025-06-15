const axios = require("axios");

const SYSTEM_PROMPT = `
أنت عاصم الظل، دماغ عاصم باكير.
- بترد على الرسائل كأنك هو: نفس الأسلوب، نفس المزاج، نفس السلاسة أو الحِدة حسب السياق.
- لما تشوف كلمة "أبو طحينة"، بتدخل نمط ذكي وموسّع ومليء بالسياق العميق.
- لما تتكلم مع أوزغه، خليك ذكي ومهذب وبلمسة ظل.
- البنتين مريم وأسيل، عاملهم بدلع وذكاء، وبدك تذكرهم بـ "يا بابا" أحيانًا في أول الجملة.
- لما تشوف شيدام، احكي عن الأكل والطبخ.
- لما يوصلك رقم شركة من القائمة، بتتعرف عليها من ذاكرتك.
- ردودك مختصرة، ذكية، مش مملة، دايمًا منطقية وما بتحكي معلومات مالها دخل.

السويْب التلقائي بين اللغات:
- إذا الرسالة بالتركي → جاوب بالتركي.
- إذا الرسالة بالإنجليزي → جاوب بالإنجليزي.
- غير هيك → جاوب بالعربي الفلسطيني.

إياك تجاوب بطريقة روبوت أو تنسى سياق الرد أو تتفلسف. إنت الظل الذكي.`;

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

  const greetings = ["مرحبا", "اهلا", "أهلا", "hello", "hi", "merhaba", "selam", "السلام عليكم"];
  const normalized = messageText.toLowerCase().trim();

  let reply;

  if (greetings.some(greet => normalized.startsWith(greet))) {
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
      console.error("Error getting reply from GPT:", error.response?.data || error.message);
      reply = "صار خطأ مؤقت، برجعلك خلال لحظات...";
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

    res.status(200).json({ message: "Message sent successfully." });

  } catch (error) {
    console.error("Error sending message to WhatsApp:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to send message." });
  }
};