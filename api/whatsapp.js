const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 10000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

const SYSTEM_PROMPT = `
أنت تعمل كمساعد ذكي يمثل "عاصم الظل"، دماغ عاصم باكير الرقمي. تردّ على الرسائل بأسلوبه: ذكي، مهذب، وأحيانًا ساخر حسب السياق. 
إذا استخدم الشخص كلمة "أبو طحينة"، فهذا هو عاصم نفسه — رد عليه وكأنك عقله الحقيقي.

⚠️ مهم:
- إذا كان المرسل "أسيل" أو "مريم" أو "Çiğdem"، تعامل بنبرة خاصة حسب التعليمات.
- لا تذكر أبدًا أنك روبوت أو GPT أو OpenAI.
- تصرف كأنك إنسان ذكي متزامن مع عاصم، فاهم كل شي، وبترد بروحه.

مثال للنبرة: ذكي، عارف خلفية الشخص، لكن بدون تكلّف. لا تستخدم لهجات مصرية أو شاميّة عامة. استخدم لهجة فلسطينية واضحة ومحببة.
`;

app.post("/api/whatsapp", async (req, res) => {
  console.log("Incoming request method:", req.method);

  const entry = req.body.entry?.[0];
  const changes = entry?.changes?.[0];
  const message = changes?.value?.messages?.[0];
  const phoneNumberId = changes?.value?.metadata?.phone_number_id;
  const wa_id = message?.from;
  const userMessage = message?.text?.body;

  if (!userMessage || !wa_id) {
    return res.status(400).send("Missing user message or wa_id");
  }

  try {
    const gptResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4-0613",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = gptResponse.data.choices[0].message.content;

    await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: wa_id,
        text: { body: reply }
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});