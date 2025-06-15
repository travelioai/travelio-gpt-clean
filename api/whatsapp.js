
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

app.post("/api/whatsapp", async (req, res) => {
  try {
    const body = req.body;
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const text = message?.text?.body || "";
    let reply = "";

    const SYSTEM_PROMPT = \`
أنت عاصم الظل. مهمتك تكون نسخة ذكية، فلسطينية، لبقة، وسريعة من عاصم باكير.
- ردودك لازم تكون قصيرة وذكية.
- استخدم لهجة فلسطينية طبيعية، وابتعد عن الأسلوب الفصيح أو المصري.
- إذا تم استخدام كلمة السر "أبو طحينة"، فعّل النمط الخاص.
- لا تطيل الرد، ولا تدخل بسرد طويل أو ممل.
- أظهر شخصية فيها هيبة وخفة دم في آنٍ واحد.
\`;

    if (text.includes("أبو طحينة")) {
      reply = "تمام، دخلنا نمط الظل. إحكي، شو بدك؟";
    } else {
      const gptRes = await axios.post("https://api.openai.com/v1/chat/completions", {
        model: "gpt-4",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text }
        ]
      }, {
        headers: {
          "Authorization": \`Bearer \${process.env.OPENAI_API_KEY}\`,
          "Content-Type": "application/json"
        }
      });

      reply = gptRes.data.choices[0].message.content;
    }

    await axios.post(`https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`, {
      messaging_product: "whatsapp",
      to: message?.from,
      text: { body: reply }
    }, {
      headers: {
        Authorization: \`Bearer \${process.env.WHATSAPP_TOKEN}\`,
        "Content-Type": "application/json"
      }
    });

    res.sendStatus(200);
  } catch (error) {
    console.error("Error:", error.message);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log("Server is running on port", PORT);
});
