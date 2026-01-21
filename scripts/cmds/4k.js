const axios = require('axios');
const fs = require('fs-extra'); 
const path = require('path');
const stream = require('stream');
const { promisify } = require('util');

const pipeline = promisify(stream.pipeline);
const API_ENDPOINT = "https://free-goat-api.onrender.com/4k"; 
const CACHE_DIR = path.join(__dirname, 'cache');

// دالة لاستخراج رابط الصورة من الأرجومنتات أو من رسالة مُجاب عليها
function extractImageUrl(args, event) {
    let imageUrl = args.find(arg => arg.startsWith('http'));

    if (!imageUrl && event.messageReply && event.messageReply.attachments && event.messageReply.attachments.length > 0) {
        const imageAttachment = event.messageReply.attachments.find(att => att.type === 'photo' || att.type === 'image');
        if (imageAttachment && imageAttachment.url) {
            imageUrl = imageAttachment.url;
        }
    }
    return imageUrl;
}

module.exports = {
    config: {
        name: "4k",
        aliases: ["upscale", "hd", "enhance"],
        version: "1.0",
        author: "NeoKEX",
        countDown: 15,
        role: 0,
        longDescription: "يزيد دقة الصورة إلى أعلى جودة (محاكاة 4K) باستخدام الذكاء الاصطناعي.",
        category: "image",
        guide: {
            en: "{pn} <رابط_الصورة> أو رد على صورة.\n\n" +
                "• مثال: {pn} https://example.com/lowres.jpg"
        }
    },

    onStart: async function ({ args, message, event }) {
        // الحصول على رابط الصورة من الأرجومنتات أو من رسالة مُجاب عليها
        const imageUrl = extractImageUrl(args, event);

        if (!imageUrl) {
            return message.reply("❌ الرجاء توفير رابط صورة أو الرد على صورة للترقية.");
        }

        if (!fs.existsSync(CACHE_DIR)) {
            fs.mkdirSync(CACHE_DIR, { recursive: true });
        }

        message.reaction("⏳", event.messageID);
        let tempFilePath; 

        try {
            // 1. إنشاء رابط API
            const fullApiUrl = `${API_ENDPOINT}?url=${encodeURIComponent(imageUrl)}`;
            
            // 2. الاتصال بالـ API للحصول على رابط الصورة بجودة أعلى
            const apiResponse = await axios.get(fullApiUrl, { timeout: 45000 });
            const data = apiResponse.data;

            if (!data.image) {
                throw new Error("تم استدعاء الـ API بنجاح لكن لم يتم العثور على رابط الصورة النهائي.");
            }

            const upscaledImageUrl = data.image;

            // 3. تحميل الصورة الجديدة كـ stream
            const imageDownloadResponse = await axios.get(upscaledImageUrl, {
                responseType: 'stream',
                timeout: 60000,
            });
            
            // 4. حفظ الـ stream في ملف مؤقت
            const fileHash = Date.now() + Math.random().toString(36).substring(2, 8);
            tempFilePath = path.join(CACHE_DIR, `upscale_4k_${fileHash}.jpg`);
            
            await pipeline(imageDownloadResponse.data, fs.createWriteStream(tempFilePath));

            message.reaction("✅", event.messageID);
            
            // 5. الرد بالصورة النهائية
            await message.reply({
                body: `🖼️ تم ترقية الصورة بنجاح إلى جودة 4K!`,
                attachment: fs.createReadStream(tempFilePath)
            });

        } catch (error) {
            message.reaction("❌", event.messageID);
            
            let errorMessage = "❌ فشل في ترقية الصورة. حدث خطأ.";
            if (error.response) {
                if (error.response.status === 400) {
                    errorMessage = `❌ خطأ 400: الرابط المقدم قد يكون غير صالح أو الصورة صغيرة/كبيرة جدًا.`;
                } else {
                    errorMessage = `❌ خطأ HTTP ${error.response.status}. قد يكون الـ API غير متاح.`;
                }
            } else if (error.message.includes('timeout')) {
                errorMessage = `❌ انتهت المهلة (الاستجابة من الـ API بطيئة جدًا).`;
            } else if (error.message) {
                errorMessage = `❌ ${error.message}`;
            }

            console.error("خطأ في أمر ترقية الصورة 4K:", error);
            message.reply(errorMessage);

        } finally {
            // حذف الملف المؤقت
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
        }
    }
};
