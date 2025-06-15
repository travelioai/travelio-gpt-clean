const axios = require("axios");
const fs = require("fs");
const path = require("path");

const memoryPath = path.join(__dirname, "memory.json");
let memory = {};
if (fs.existsSync(memoryPath)) {
  memory = JSON.parse(fs.readFileSync(memoryPath, "utf-8"));
}

const SYSTEM_PROMPT = `
أنت "Travelio AI"، مساعد سياحي ذكي.
- تجاوب حسب اللغة الواردة (عربي، تركي، إنجليزي)
- لا تعرّف عن نفسك بذكاء صناعي ولا تعطي معلومات حساسة.
- إذا تم ذكر "أبو طحينة" في الرسالة، فعّل نمط "عاصم الظل" وكن أذكى وخصوصي.
- إذا الرسالة من رقم محفوظ بالذاكرة، خاطب الشخص باسمه أو كنيته بلطافة.
- إذا الرسالة تحية مثل "مرحبا" أو "hello"، رد بجملة تعريف بسيطة مثل:
  "أنا Travelio AI، كيف بقدر أساعدك؟"
`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const text = message?.text?.body;
  const from = message?.from;

  if (!text || !from) {
    return res.status(200).json({ message: "No text message." });
  }

  const normalized = text.toLowerCase().trim();
  const greetings = ["hi", "hello", "مرحبا", "اهلا", "selam", "merhaba"];
  const introTriggers = ["who are you", "من انت", "kimsin"];

  let reply;

  if (greetings.some(greet => normalized.startsWith(greet)) || introTriggers.some(q => normalized.includes(q))) {
    reply = "أنا Travelio AI، كيف بقدر أساعدك؟";
  } else if (normalized.includes("how are you")) {
    reply = "I'm good! How are you too?";
  } else {
    try {
      const completion = await axios.post(process.env.AI_API_URL, {
        model: "gpt-4",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text }
        ]
      }, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        }
      });

      reply = completion.data.choices?.[0]?.message?.content?.trim() || "تم المعالجة، كيف بقدر أساعدك؟";

    } catch (err) {
      console.error("GPT Error:", err.message);
      reply = "واجهتني مشكلة بسيطة، جرب مرة ثانية 🙏";
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
    console.error("WhatsApp Send Error:", err.message);
    res.status(500).json({ error: "Failed to send reply." });
  }
};
