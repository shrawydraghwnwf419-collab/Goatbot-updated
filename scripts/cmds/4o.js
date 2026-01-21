const axios = require("axios");

module.exports = {
  config: {
    name: "4o",
    aliases: ["gpt4o", "dalle4o"],
    version: "1.0",
    author: "Neoaz ゐ", //API بواسطة RIFAT
    countDown: 10,
    role: 0,
    shortDescription: { ar: "توليد صورة بالذكاء الاصطناعي باستخدام 4o" },
    longDescription: { ar: "توليد الصور باستخدام نموذج الذكاء الاصطناعي 4o" },
    category: "image",
    guide: {
      ar: "{pn} <الوصف>"
    }
  },

  onStart: async function ({ message, event, api, args }) {
    const hasPrompt = args.length > 0;

    if (!hasPrompt) {
      return message.reply("يرجى إدخال وصف للصورة.");
    }

    const prompt = args.join(" ").trim();
    const model = "4o";

    try {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      const res = await axios.get("https://fluxcdibai-1.onrender.com/generate", {
        params: { prompt, model },
        timeout: 120000
      });

      const data = res.data;
      const resultUrl = data?.data?.imageResponseVo?.url;

      if (!resultUrl) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply("فشل في توليد الصورة.");
      }

      api.setMessageReaction("✅", event.messageID, () => {}, true);

      await message.reply({
        body: "تم توليد الصورة 🐦",
        attachment: await global.utils.getStreamFromURL(resultUrl)
      });

    } catch (err) {
      console.error(err);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("حدث خطأ أثناء توليد الصورة.");
    }
  }
};
