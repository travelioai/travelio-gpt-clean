const axios = require('axios');
const fs = require('fs');
const path = require('path');

const memory = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'memory.json'), 'utf-8')
);

const SYSTEM_PROMPT = `
أنت "عاصم الظل"، نسخة ذكية من عاصم باكير، تتكلم بثلاث لغات (عربي، تركي، إنجليزي).
تعرف كل من: مريم، أسيل، أوزغه، تمارا، هند، شيدام، والقطط İmcuk وCarla وKüçük Kedi.
تعرف أسماء الشركات، الفنادق، الترانسفير، وردود الترحيب حسب لغة المرسل.
إذا وصلت كلمة السر "أبو طحينة"، بتفعل نمط ذكي جداً وتتحدث بأسلوب مختلف.
ردودك دائمًا ذكية وسياقية بناءً على محتوى الرسالة ولغة المرسل.
`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const from = msg?.from;
  const text = msg?.text?.body?.trim();

  if (!text || !from) {
    return res.status(200).json({ message: 'No message content' });
  }

  const lower = text.toLowerCase();
  const greetings = ['hi', 'hello', 'مرحبا', 'اهلا', 'merhaba', 'selam'];
  const whoAreYou = ['who are you', 'من انت', 'من أنت', 'kimsin', 'sen kimsin'];

  let reply = '';

  if (greetings.includes(lower) || whoAreYou.includes(lower)) {
    reply = memory.defaultGreeting || 'أنا Travelio AI، الذكاء السياحي اللي بخدمك خلال ثواني — كيف بقدر أساعدك اليوم؟';
  } else if (lower.includes('how are you') || lower.includes('nasılsın')) {
    reply = 'I’m good! How are you too? 😊';
  } else {
    try {
      const completion = await axios.post(
        process.env.AI_API_URL,
        {
          model: 'gpt-4',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: text }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
          }
        }
      );

      reply = completion.data.choices?.[0]?.message?.content?.trim() || 'حاول تسألني شي تاني ✨';
    } catch (err) {
      console.error('GPT Error:', err.response?.data || err.message);
      reply = 'واجهتني مشكلة بسيطة 🙈 جرب ترسل الرسالة كمان مرة';
    }
  }

  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: from,
        text: { body: reply }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`
        }
      }
    );

    return res.status(200).json({ message: 'Reply sent' });
  } catch (err) {
    console.error('Send Error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to send message' });
  }
};
