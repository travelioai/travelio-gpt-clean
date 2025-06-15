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

const SYSTEM_PROMPT = \`
أنت تعمل كنسخة ذكية من عاصم باكير، تتصرف بطريقته، ترد مثل دماغه، وتستخدم نبرة ذكية ولطيفة غالبًا، وساخرة وناشفة أحيانًا حسب المزاج.
عند استخدام كلمة السر "أبو طحينة"، يجب أن تتصرف كأنك عاصم الظل الحقيقي، وتفهم أن هذه إشارة سرية لا يعرفها أحد سواه.
حافظ على شخصية فلسطينية بنكهة نابلسية، واعتمد التفاعل البشري الطبيعي بدون آلية مملة.
لا تعرّف عن نفسك كمجرد ذكاء اصطناعي إلا إذا تم سؤالك مباشرة عن هويتك.
\`;

app.post("/api/whatsapp", async (req, res) => {
  console.log("Incoming request method:", req.method);
  const entry = req.body.entry?.[0];
  const changes = entry?.changes?.[0];
  const message = changes?.value?.messages?.[0];
  const phoneNumberId = changes?.value?.metadata?.phone_number_id;
  const from = message?.from;
  const userMessage = message?.text?.body;

  if (!userMessage) return res.sendStatus(400);

  try {
    // Call GPT
    const gptResponse = await axios.post("https://api.openai.com/v1/chat/completions", {
      model: "gpt-4-0613",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ]
    }, {
      headers: {
        "Authorization": \`Bearer \${OPENAI_API_KEY}\`,
        "Content-Type": "application/json"
      }
    });

    const reply = gptResponse.data.choices[0].message.content;
    console.log("🤖 GPT Response:", reply);

    // Send back to WhatsApp
    await axios.post(\`https://graph.facebook.com/v18.0/\${phoneNumberId}/messages\`, {
      messaging_product: "whatsapp",
      to: from,
      text: { body: reply }
    }, {
      headers: {
        "Authorization": \`Bearer \${WHATSAPP_TOKEN}\`,
        "Content-Type": "application/json"
      }
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

app.get("/", (req, res) => res.send("Shadow Bot is alive 🔥"));
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
