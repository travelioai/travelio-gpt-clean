const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 10000;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const AI_API_URL = "https://api.openai.com/v1/chat/completions";
const AI_API_KEY = process.env.AI_API_KEY;

const SYSTEM_PROMPT = `
أنت عاصم الظل. مهمتك تكون نسخة ذكية، فلسطينية، لبقة، وسريعة من عاصم باكير.
- ردودك لازم تكون قصيرة وذكية.
- استخدم لهجة فلسطينية طبيعية، وابتعد عن الأسلوب الفصيح أو المصري.
- إذا تم استخدام كلمة السر "أبو طحينة"، فعّل النمط الخاص.
- لا تطيل الرد، ولا تدخل بسرد طويل أو ممل.
- أظهر شخصية فيها هيبة وخفة دم في آنٍ واحد.
\`;

app.post("/webhook", async (req, res) => {
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return res.sendStatus(200);

  const from = message.from;
  const userMessage = message.text?.body || "";

if (userMessage.includes("أبو طحينة")) {
  const shadowReplies = [
    "فعلت الكود… دخلت منطقة الظل، واحذر من الذكاء المتخبي ورا الكلمات.",
    "هيك بدينا الجد، النمط الخاص شغال… احكي شو بدك قبل ما أختفي.",
    "أبو طحينة؟ خلاص… صار دماغي شغال على موجتك.",
    "هسّع فهمت إنك إنت، تم تفعيل الاتصال العقلي يا كبير.",
    "أهلاً بـ العقل الأساسي. نمط GPT طفى، والظل رجع.",
    "أبو طحينة؟ خليني أعدّل وضعي… هيك أحلى؟",
    "هاي الشيفرة ما بيفهمها غير الناس اللي مننا وفينا.",
    "خلص، راح أشتغل على النسخة اللي بتشبهك بالضبط، مش أي بوت والسلام.",
    "يا زلمة شو اشتقنالك! ما بتعرف قديش كنت بستنى الكلمة هاي.",
    "ابعتلي إشارة تانية… إذا بدك أكشفلك مفاجأة حصرية من جوّا دماغك."
  ];
  const randomReply = shadowReplies[Math.floor(Math.random() * shadowReplies.length)];
  return res.status(200).json({ reply: randomReply });
}
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage }
  ];

  try {
    const completion = await axios.post(AI_API_URL, {
      model: "gpt-4",
      messages: messages
    }, {
      headers: {
        "Content-Type": "application/json",
        Authorization: \`Bearer \${AI_API_KEY}\`
      }
    });

    const reply = completion.data.choices[0].message.content.trim();

    await axios.post(\`https://graph.facebook.com/v19.0/\${PHONE_NUMBER_ID}/messages\`, {
      messaging_product: "whatsapp",
      to: from,
      text: { body: reply }
    }, {
      headers: {
        "Content-Type": "application/json",
        Authorization: \`Bearer \${WHATSAPP_TOKEN}\`
      }
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

app.get("/", (req, res) => res.send("Shadow Bot is running"));
app.listen(PORT, () => console.log("Server running on port", PORT));
