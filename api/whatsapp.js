const axios = require("axios");
const fs = require("fs");
const path = require("path");

const memory = JSON.parse(fs.readFileSync(path.join(__dirname, "memory.json"), "utf-8"));

const SYSTEM_PROMPT = `
أنت "Travelio AI" – ذكاء سياحي ناطق بثلاث لغات (العربية، التركية، الإنجليزية)
تجاوب على أساس أن دماغك مأخوذ من عقل عاصم باكير، فلا تتحدث عن نفسك كروبوت، ولا تكرر نفس العبارات.
إذا أرسل لك الشخص كلمة "أبو طحينة"، فاعرف أنه أحد المقربين وتعامل معه بأسلوب الظل.
إذا أرسل رقم معروف من الذاكرة، تصرّف كأنك تعرف الشخص واذكر اسمه.
إذا اللغة عربية، جاوب بفلسطيني ذكي.
إذا اللغة تركية، جاوب كأنك موظف لبق في مكتب حجوزات.
إذا اللغة إنجليزية، جاوب بأسلوب عملي مباشر ومهذب.

دائمًا جاوب بشكل ذكي وسياقي — الردود لازم تكون قصيرة وواقعية، بدون مبالغة أو روبوتية.
`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const incomingMessage = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const from = incomingMessage?.from;
  const messageText = incomingMessage?.text?.body;

  if (!messageText) {
    return res.sendStatus(200);
  }

  let name = memory[from]?.name || null;
  let lang = detectLanguage(messageText);
  let prompt = buildPrompt(name, lang, messageText);

  const gptResponse = await axios.post("https://api.openai.com/v1/chat/completions", {
    model: "gpt-4",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ]
  }, {
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    }
  });

  const reply = gptResponse.data.choices[0].message.content;

  await axios.post(`https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`, {
    messaging_product: "whatsapp",
    to: from,
    text: { body: reply }
  }, {
    headers: {
      "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json"
    }
  });

  res.sendStatus(200);
};

function detectLanguage(text) {
  if (/^[؀-ۿ\s]+$/.test(text)) return "ar";
  if (/[çğıöşüÇĞİÖŞÜ]/.test(text) || /merhaba|nasılsın|teşekkürler/i.test(text)) return "tr";
  return "en";
}

function buildPrompt(name, lang, text) {
  const intro = name ? `الرسالة من ${name}،` : "";
  switch (lang) {
    case "ar":
      return `${intro} شخص كتب: "${text}"، جاوب عليه بأسلوب ذكي فلسطيني.`;
    case "tr":
      return `${intro} Bir kişi şöyle yazdı: "${text}", kibar ve profesyonel bir şekilde cevap ver.`;
    case "en":
    default:
      return `${intro} Someone wrote: "${text}". Respond naturally, like a smart assistant.`;
  }
}