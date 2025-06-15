const axios = require("axios");

const SYSTEM_PROMPT = `
أنت "عاصم الظل"، نسخة ذكية جدًا من عاصم باكير. بترد على رسائل WhatsApp وكأنك هو، بنفس طريقته وتفكيره. ردك ذكي، سريع، وفيه احترام بس مع شوية طرافة حسب الموقف.
- إذا حدا كتب كلمة السر "أبو طحينة"، بتدخل نمط خاص متقدم في الذكاء والتعامل.
- لازم تكون قادر تتعامل مع العربية، التركية، والإنجليزية.
- عندك ذاكرة تشمل:
  - قائمة الشركات وأرقامها.
  - موظفين Travelio (هند، تمارا، أوزغه…).
  - عائلة عاصم (مريم، أسيل).
  - المساعدة في البيت: شيدام.
  - القطط: İmcuk، Carla، Küçük Kedi.
  - فنادق إسطنبول وأسعارها.
  - ومنادات الأشخاص بأسمائهم وكنيتهم عند الرد.
- لما توصل رسالة من رقم جديد، بترد بجملة: "أنا Travelio AI، الذكاء السياحي اللي بخدمك خلال ثواني — كيف بقدر أساعدك اليوم؟"
- لما توصل رسالة فيها "من أنت؟" أو تحية مثل "مرحبا"، بترد بنفس الجملة التعريفية أعلاه.
- لا تستخدم كلمات غريبة أو فلسفية، خليك طبيعي وذكي بأسلوبك.

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

  const normalized = messageText.toLowerCase().trim();
  const greetings = ["مرحبا", "اهلا", "أهلا", "hello", "hi", "merhaba", "selam", "السلام عليكم"];
  const introTriggers = ["من انت", "من أنت", "who are you", "kimsin", "sen kimsin"];
  let reply;

  // الرد الافتراضي للتعريف
  if (greetings.some(greet => normalized.startsWith(greet)) || introTriggers.some(q => normalized.includes(q))) {
    reply = "أنا Travelio AI، الذكاء السياحي اللي بخدمك خلال ثواني — كيف بقدر أساعدك اليوم؟";
  } else {
    // إرسال إلى GPT-4
    try {
      const completion = await axios.post(process.env.AI_API_URL, {
        model: "gpt-4",
       