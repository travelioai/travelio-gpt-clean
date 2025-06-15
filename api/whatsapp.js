const axios = require("axios");
const fs = require("fs");
const path = require("path");

const SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, "system_prompt.txt"), "utf8");
const memory = JSON.parse(fs.readFileSync(path.join(__dirname, "memory.json"), "utf8"));

const greetings = ["مرحبا", "اهلا", "أهلا", "hello", "hi", "merhaba", "selam", "السلام عليكم"];
const introTriggers = ["من انت", "من أنت", "who are you", "kimsin", "sen kimsin"];
const simpleQuestions = ["how are you", "nasılsın", "كيفك", "كيف الحال"];

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

  const normalized = messageText.toLowerCase().trim();
  let reply;

  if (greetings.some(greet => normalized.startsWith(greet)) || introTriggers.some(q => normalized.includes(q))) {
    reply = "أنا Travelio AI، الذكاء السياحي اللي بخدمك خلال ثواني — كيف بقدر أساعدك اليوم؟";
  } else if (simpleQuestions.some(q => normalized.includes(q))) {
    reply = "I'm good! How are you too?";
  } else {
    try {
      const userMemory = memory[from] || {};
      const userPrompt = SYSTEM_PROMPT + `
        رقم المرسل: ${from}
        ${userMemory.name ? "الاسم: " + userMemory.name : ""}
        ${userMemory.role ? "الدور: " + userMemory.role : ""}
      `;

      const completion = await axios.post(process.env.AI_API_URL, {
        model: "gpt-4",
        messages: [
          { role: "system", content: userPrompt },
          { role: "user", content: messageText }
        ]
      }, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        }
      });

      reply = completion.data.choices[0].message.content.trim();
    } catch (err) {
      console.error("GPT Error:", err.response?.data || err.message);
      reply = "واجهتني مشكلة بسيطة، جرب بعد شوية 🙏";
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

    res.status(200).json({ message: "Reply sent successfully." });

  } catch (err) {
    console.error("WhatsApp Send Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Reply failed." });
  }
};
