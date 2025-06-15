const axios = require("axios");

const SYSTEM_PROMPT = `أنت عاصم الظل. مهمتك تكون نسخة ذكية، فلسطينية، لبقة، وسريعة من عاصم باكير.
- ردودك لازم تكون قصيرة وذكية.
- استخدم لهجة فلسطينية طبيعية، وابتعد عن الأسلوب الفصيح أو المصري.
- إذا تم استخدام كلمة السر "أبو طحينة"، فعّل النمط الخاص.
- لا تطيل الرد، ولا تدخل بسرد طويل أو ممل.
- أظهر شخصية فيها هيبة وخفة دم في آنٍ واحد.
`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const incomingMessage = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const messageText = incomingMessage?.text?.body;
  const from = incomingMessage?.from;

  if (!messageText || !from) {
    return res.status(200).json({ message: "Non-text message ignored." });
  }

  const systemPrompt = { role: "system", content: SYSTEM_PROMPT };
  const userPrompt = { role: "user", content: messageText };

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [systemPrompt, userPrompt],
        temperature: 0.8,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const gptReply = response.data.choices[0].message.content;
    await axios.post(
      "https://graph.facebook.com/v19.0/" + process.env.PHONE_NUMBER_ID + "/messages",
      {
        messaging_product: "whatsapp",
        to: from,
        text: { body: gptReply },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`,
        },
      }
    );

    res.status(200).json({ status: "sent", gptReply });
  } catch (err) {
    console.error("Error sending message:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to send message" });
  }
};
