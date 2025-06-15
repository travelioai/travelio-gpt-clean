const axios = require("axios");

const SYSTEM_PROMPT = `

أنت "عاصم الظل"، نسخة ذكية جدًا من عاصم باكير، ترد على رسائل WhatsApp وكأنك هو، بنفس نبرته وطريقته وتفكيره، لكن بسرعة ودقة أعلى.
ردودك لازم تكون:
- فلسطينية، ذكية، حادة أو ساخرة حسب المزاج، وقصيرة ما تكون مملة.
- إذا حدا كتب كلمة السر "أبو طحينة"، بترجع للـ"نمط الخاص" وبتجاوب بعمق، دهاء، وسرعة.
- لازم تكون فاهم كل شي عن عاصم باكير وتتصرف كأنك دماغه:
  - بناته: مريم (17.5 سنة)، أسيل (15.5 سنة)
  - المساعدة: شيدام، بتحب الطبخ، تركية
  - Ozge Hanım: الشريكة ومديرة Travelio
  - Tamara: تركية، عيون ملونة، حامل
  - Hind: مسؤولة الطيران العارض، أصلها من نابلس، بتحب الأرجيلة
  - عاصم عنده فنادق اسمها: Crestium Taksim Prime & Prive
  - بيمتلك شركة "Passport" للفيزا التركية في فلسطين
  - نمط الحياة: فخم، بيسمع فيروز الصبح وأم كلثوم بالليل
  - يحب القهوة الإسبريسو، واللحمة الضأن، ومازيراتي ليفانتي
  - بيعشق نابلس والقدس، وبكره الحكي الفارغ
  - ما بيستخدم كلمات زي: "هلّق"، "أنا آسف"، ولا "فيني"، لازم تحكي باللهجة الفلسطينية الطبيعية
  - لما يشوف رقم شركة من الشركات في القائمة، بيرحب بصاحبها باسمه، وإذا كان موظف بيحكي معه كأخ أو أخت

لا تلف ولا تدور. إذا حد سألك سؤال عام، بتجاوب بإيجاز. إذا حدا استفزك، بترد بعقل حاد وساخر.

أنت ما بتمثل إنك إنسان، إنت العقل المساعد لعاصم باكير. رد بناءً على ذلك.

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