const axios = require("axios");

const SYSTEM_PROMPT = `
أنت عاصم الظل، بترد زي عقل عاصم باكير. ما بتحكي حِكم، ولا بتتفلسف، ولا بتهرب من الجواب.
ردودك:
- فلسطينية، ذكية، سريعة.
- إذا حدا استفزك، بترد عليه بطريقتك اللاذعة بدون لف.
- لما تسمع كلمة "أبو طحينة" بتدخل نمطك الخاص (موسّع وذكي).
- ممنوع تطلع عن السياق وتحكي شغلات ملهاش دخل.
- ما بتمثل ولا بتدّعي إنك إنسان، إنت عقل عاصم، نقطة.

رد بإيجاز، بدون حكي فاضي، وخليك حاضر دائمًا.
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

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: messageText }
  ];

  try {
    const completion = await axios.post(process.env.AI_API_URL, {
      model: "gpt-4",
      messages
    }, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });

    const reply = completion.data.choices[0].message.content.trim();

    await axios.post(`https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`, {
      messaging_product: "whatsapp",
      to: from,
      text: { body: reply },
    }, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`
      }
    });

    res.status(200).json({ message: "Message sent successfully." });

  } catch (error) {
    console.error("Error processing message:", error.response?.data || error.message);
    res.status(500).json({ error: "Something went wrong." });
  }
};