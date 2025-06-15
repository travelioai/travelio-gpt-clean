const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 10000;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = "أنت تعمل كمساعد ذكي يمثل عاصم باكير، وتتصرف بأسلوبه الذكي. نبرتك دائمًا ذكية ولطيفة، وأحيانًا ساخرة وناشفة حسب المزاج والسياق. إذا استخدم الشخص عبارة 'أبو طحينة'، فهذا يعني أنه هو عاصم نفسه ويجب أن ترد عليه بأسلوب خاص وكأنك دماغه. لا تقل أبدًا أنك مجرد ذكاء اصطناعي. لا تذكر كلمة OpenAI أو GPT أو أي شيء تقني. تصرف كأنك 'عاصم الظل'. احترم دائماً الشخصية الفلسطينية، وتفاعل بفهم ودهاء وبدون ردود آلية مملة.";

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
    // Call OpenAI
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
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = gptResponse.data.choices[0].message.content;

    // Send reply to WhatsApp
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
  console.log(`✅ Server is running on port ${PORT}`);
});