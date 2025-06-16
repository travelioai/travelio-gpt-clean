
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const memory = JSON.parse(fs.readFileSync(path.join(__dirname, "memory.json"), "utf-8"));

const SYSTEM_PROMPT = `
أنت Travelio AI، الذكاء السياحي الخاص بعاصم باكير.
ردودك لازم تكون ذكية، مختصرة، وسياقية حسب الرسالة.
- ما تكرر التحيات كثير.
- جاوب بسرعة وبأسلوب ودي أو مهني حسب السياق.
- خليك حاضر ذهنيًا لأي تلميح أو معلومة شخصية، واستغلها بذكاء.
`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const incomingMessage = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const from = incomingMessage?.from;
  const messageText = incomingMessage?.text?.body;

  if (!messageText || !from) {
    return res.sendStatus(200);
  }

  const name = memory[from]?.name || "";
  const language = memory[from]?.lang || "ar";

  let reply = "";

  if (messageText.toLowerCase().includes("فندق") || messageText.toLowerCase().includes("احجز")) {
    reply = `تمام، ممكن تحكيلي تاريخ الوصول والمغادرة، وعدد الأشخاص، والمكان اللي بتحب الفندق فيه؟`;
  } else if (messageText.toLowerCase().includes("مرحبا") || messageText.toLowerCase().includes("السلام")) {
    reply = `أهلاً، كيف فيني أساعدك اليوم؟`;
  } else {
    reply = `أنا جاهز للمساعدة، بس بحتاج أعرف شوي تفاصيل أكثر منك 🙏`;
  }

  await axios.post(
    `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to: from,
      text: { body: reply },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  res.sendStatus(200);
};
