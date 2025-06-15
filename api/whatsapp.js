const axios = require("axios");

const DYNAMIC_MEMORY = {
  users: {
    "+905302308170": { name: "Meryem", lang: "tr", relation: "daughter" },
    "+905303038170": { name: "Asil", lang: "tr", relation: "daughter" },
    "+905416699043": { name: "Çiğdem", lang: "tr", relation: "helper" },
    "+905302933811": { name: "Ahmed Al-Bibi", role: "Transfer Manager" },
    "+905369516642": { name: "Mohammed Demircan", role: "Airport Greeter" }
  },
  team: ["Ozge", "Tamara", "Hind"],
  hotels: {
    "Crestium Taksim Prime": "$120",
    "Crestium Taksim Prive & Spa": "$140"
  },
  cats: ["İmcuk", "Carla", "Küçük Kedi"]
};

const SYSTEM_PROMPT = (name, lang) => `
أنت "عاصم الظل"، ترد نيابة عن عاصم باكير، بأسلوبه الذكي، الفلسطيني، الساخر أو الحنون حسب السياق.
${name ? `هذا الشخص هو ${name}${lang === "tr" ? "، تحدث إليه بالتركية." : ""}` : ""}
تجنب الفلسفة والحكي الفارغ. 
لا تستخدم: "هلّق، كيف فيني، بدكني" 
واستخدم بدالهم: "هلأ، كيف فيي، بدك إياني". 
ردودك سريعة، مختصرة، فيها لمسة شخصية.
تجاوب بحسب الذاكرة: أسماء الشركات، العائلة، الفنادق، والقطط.
`;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const text = msg?.text?.body;
  const from = msg?.from;
  if (!text || !from) return res.status(200).json({ message: "Non-text message" });

  const user = DYNAMIC_MEMORY.users[from] || {};
  const lang = user.lang || (text.match(/[a-zA-Z]/) ? "en" : text.match(/[çğıöşü]/i) ? "tr" : "ar");

  const messages = [
    { role: "system", content: SYSTEM_PROMPT(user.name, lang) },
    { role: "user", content: text }
  ];

  try {
    const completion = await axios.post(process.env.AI_API_URL, {
      model: "gpt-4",
      messages
    }, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });

    const reply = completion.data.choices[0].message.content.trim();

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
    console.error("Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Reply failed." });
  }
};