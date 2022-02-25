// https://github.com/salismazaya/whatsapp-bot

const fs = require("fs");
const axios = require("axios");
const PDFDocument = require("pdfkit");
const brainly = require("brainly-scraper");
const tesseract = require("node-tesseract-ocr");
const webpConverter = require("./lib/webpconverter.js");
const bahasa_planet = require('./lib/bahasa_planet')
const WSF = require("wa-sticker-formatter");
const { MessageType, Mimetype } = require("@adiwajshing/baileys");

const inPdfInput = [];
const questionAnswer = {};
const bufferImagesForPdf = {};
const quotesList = JSON.parse(fs.readFileSync("lib/quotes.json", "utf-8"));
const factList = JSON.parse(fs.readFileSync("lib/fact.json", "utf-8"));


const messageHandlerFunction = async(conn, message) => {
    const senderNumber = message.key.remoteJid;
    const imageMessage = message.message.imageMessage;
    const videoMessage = message.message.videoMessage;
    const stickerMessage = message.message.stickerMessage;
    const extendedTextMessage = message.message.extendedTextMessage;
    const quotedMessageContext = extendedTextMessage && extendedTextMessage.contextInfo && extendedTextMessage.contextInfo;
    const quotedMessage = quotedMessageContext && quotedMessageContext.quotedMessage;
    const textMessage = message.message.conversation || message.message.extendedTextMessage && message.message.extendedTextMessage.text || imageMessage && imageMessage.caption || videoMessage && videoMessage.caption
    let command, parameters;

    if (textMessage) {
        // command = textMessage.trim().split(" ")[0];
        // parameter = textMessage.trim().split(" ").slice(1).join(" ");

        let a = textMessage.trim().split("\n");
        let b = "";
        command = a[0].split(" ")[0];
        b += a[0].split(" ").slice(1).join(" ");
        b += a.slice(1).join("\n")
        parameters = b.trim();
    }

    if (inPdfInput.includes(senderNumber)) {
        if (stickerMessage) return;
        if (command == "!done" || bufferImagesForPdf[senderNumber].length > 19) {
            const pdf = new PDFDocument({ autoFirstPage: false });
            const bufferImages = bufferImagesForPdf[senderNumber];
            for (const bufferImage of bufferImages) {
                const image = pdf.openImage(bufferImage);
                pdf.addPage({ size: [image.width, image.height] });
                pdf.image(image, 0, 0);
            }

            const pathFile = ".temp/" + Math.floor(Math.random() * 1000000 + 1) + ".pdf";
            const file = fs.createWriteStream(pathFile);
            pdf.pipe(file)
            pdf.end()

            file.on("finish", () => {
                const file = fs.readFileSync(pathFile);
                conn.sendMessage(senderNumber, file, MessageType.document, { mimetype: Mimetype.pdf, filename: Math.floor(Math.random() * 1000000) + ".pdf", quoted: message });
                fs.unlinkSync(pathFile);
                inPdfInput.splice(inPdfInput.indexOf(senderNumber), 1);
                delete bufferImagesForPdf[senderNumber];
            })

        } else if (command == "!cancel") {
            delete bufferImagesForPdf[senderNumber];
            inPdfInput.splice(inPdfInput.indexOf(senderNumber), 1);
            conn.sendMessage(senderNumber, "Operation cancelled!", MessageType.text, { quoted: message })

        } else if (imageMessage && imageMessage.mimetype == "image/jpeg") {
            const bufferImage = await conn.downloadMediaMessage(message);
            bufferImagesForPdf[senderNumber].push(bufferImage);

            conn.sendMessage(senderNumber, `[${bufferImagesForPdf[senderNumber].length}] Successfully added image!, send *!done* when finished, *!cancel* if you want to cancel`, MessageType.text, { quoted: message })

        } else {
            conn.sendMessage(senderNumber, "That's not an image! send *!done* when finished, *!cancel* if you want to cancel", MessageType.text, { quoted: message })
        }

        returns;
    }

    switch (command) {
        case "!help":
            {
                {

                    const text = `Hello Minions welcome to *${conn.user.name}*!
- send *!help* to see the list of commands from this bot
- send *!contact* to contact the bot creator
- send a picture with the caption *!sticker* to make a sticker
- send a picture with the caption *!stickernobg* to make a sticker without a background
- send *!pdf* to create pdf from images
- reply sticker with caption *!toimg* to make sticker to image
- reply sticker moves with caption *!togif* to make sticker to gif
- send *!textsticker [your text]* to make a text sticker
  example: !textsticker is sticker
- send *!giftextsticker [your text]* to make a text sticker pauses jedug
  example: !giftextsticker is a sticker
- send a video with the caption *!gifsticker* to make the sticker move
- send *!write [insert text here]* to write to paper
  example: !write this my writing
- send *!brainly [your question]* to search for questions and answers on brainly
  example: !brainly what is nodejs
- *!quotes* to get quotes
- *!randomfact* to get random knowledge
- *!gtts [language code] [text]* to convert text to google voice. For language code, see here https://s.id/xSj1g
   example: !gtts my id is bot
- *!wikipedia [query]* to search and read articles on wikipedia
   example: !wikipedia Python
- *!math* to work on problems
mathematics
- *!bplanet [alias] [text]*
   example: !bplanet g what are you doing?
- send image with caption *!ocr* to get text from image
The bot is sensitive to symbols/spaces/lowercase/capital letters so it won't reply in case of a typo!
This bot is open source! Bro, you can check at https://github.com/salismazaya/whatsapp-bot (if you want to edit, please don't delete this link)
what? want to treat me? https://saweria.co/salismazaya`.replace("(if you want to edit please don't delete this link)", "");

                    conn.sendMessage(senderNumber, text, MessageType.text, { quoted: message });
                    break;
                }

                conn.sendMessage(senderNumber, text, MessageType.text, { quoted: message });
                break;
            }

        case "!sticker":
        case "!sticker":
            {
                if (quotedMessage) {
                    message.message = quotedMessage;
                }

                if (!message.message.imageMessage || message.message.imageMessage.mimetype != "image/jpeg") {
                    conn.sendMessage(senderNumber, "No image :)", MessageType.text, { quoted: message });
                    break;
                }

                const imagePath = await conn.downloadAndSaveMediaMessage(message, Math.floor(Math.random() * 1000000));
                const sticker = new WSF.Sticker("./" + imagePath, { crop: false, pack: "dfkm :)", author: 'Udy' });
                await sticker.build();
                fs.unlinkSync(imagePath);
                const bufferImage = await sticker.get();
                conn.sendMessage(senderNumber, bufferImage, MessageType.sticker, { quoted: message });
                break;
            }

        case "!toimg":
            {
                if (!quotedMessage || !quotedMessage.stickerMessage || quotedMessage.stickerMessage.mimetype != "image/webp") {
                    conn.sendMessage(senderNumber, "Must reply sticker :)", MessageType.text, { quoted: message });
                    break;
                }

                message.message = quotedMessage;
                const webpImage = await conn.downloadMediaMessage(message);
                const jpgImage = await webpConverter.webpToJpg(webpImage);
                conn.sendMessage(senderNumber, jpgImage, MessageType.image, { quoted: message, caption: "Here's the picture baby!" });
                break;
            }


        case "!togif":
            {
                if (!quotedMessage || !quotedMessage.stickerMessage || quotedMessage.stickerMessage.mimetype != "image/webp") {
                    conn.sendMessage(senderNumber, "Must reply sticker :)", MessageType.text, { quoted: message });
                    break;
                }

                message.message = quotedMessage;
                const webpImage = await conn.downloadMediaMessage(message);
                const video = await webpConverter.webpToVideo(webpImage);
                conn.sendMessage(senderNumber, video, MessageType.video, { quoted: message, mimetype: Mimetype.gif });
                break;
            }

        case "!write":
        case "!write":
            {
                if (!parameters) {
                    conn.sendMessage(senderNumber, "No text :)", MessageType.text, { quoted: message });
                    break;
                }

                const response = await axios.post("https://salism3api.pythonanywhere.com/write", { "text": parameter });
                const imagesUrl = response.data.images.slice(0, 4);

                for (const imageUrl of imagesUrl) {
                    const response = await axios({
                        url: imageUrl,
                        methods: "GET",
                        responseType: "arraybuffer",
                    });
                    const image = Buffer.from(response.data, "binary");
                    await conn.sendMessage(senderNumber, image, MessageType.image, { quoted: message });
                }
                break;
            }

        case "!pdf":
            {
                if (message.participant) {
                    conn.sendMessage(senderNumber, "This feature does not work in groups :(", MessageType.text, { quoted: message });
                    break;
                }

                if (imageMessage) {
                    conn.sendMessage(senderNumber, "Send without image!", MessageType.text, { quoted: message });
                    break;
                }

                inPdfInput.push(senderNumber);
                bufferImagesForPdf[senderNumber] = [];

                conn.sendMessage(senderNumber, "Please send pictures one by one! Don't spam!", MessageType.text, { quoted: message });
                break;
            }

        case "!brainly":
            {
                if (!parameters) {
                    conn.sendMessage(senderNumber, "Invalid input baby :)", MessageType.text, { quoted: message });
                    break;
                }

                const data = await brainly(parameter);
                if (data.success && data.data.length <= 0) {
                    conn.sendMessage(senderNumber, "Question not found :(", MessageType.text, { quoted: message })

                } else if (data.success) {
                    for (const question of data.data.slice(0, 3)) {
                        const text = `*Question:* ${question.question.trim()}\n\n*Answer*: ${question.answer[0].text.replace("Answer:", "").trim( )}`
                        await conn.sendMessage(senderNumber, text, MessageType.text, { quoted: message })
                    }
                }
                break;
            }

        case "!quotes":
            {
                const quotes = quotesList[Math.floor(Math.random() * quotesList.length)];
                const text = `_"${quotes.quote}"_\n\n - ${quotes.by}`;
                conn.sendMessage(senderNumber, text, MessageType.text, { quoted: message });
                break;
            }

        case "!randomfact":
        case "!fact":
            {
                const fact = factList[Math.floor(Math.random() * factList.length)];
                const text = `_${fact}_`
                conn.sendMessage(senderNumber, text, MessageType.text, { quoted: message });
                break;
            }

        case "!gtts":
        case "!tts":
        case "!text2sound":
            {
                if (!parameters) {
                    conn.sendMessage(senderNumber, "Invalid input baby :)", MessageType.text, { quoted: message });
                    break;
                }

                if (parameter.split(" ").length == 1) {
                    conn.sendMessage(senderNumber, "No language code / text", MessageType.text, { quoted: message });
                    break;
                }

                const language = parameter.split(" ")[0];
                const text = parameter.split(" ").splice(1).join(" ");
                axios({
                    url: `https://salism3api.pythonanywhere.com/text2sound`,
                    methods: "POST",
                    responseType: "arraybuffer",
                    data: {
                        "languageCode": language,
                        "text": text,
                    }
                }).then(response => {
                    const audio = Buffer.from(response.data, "binary");
                    conn.sendMessage(senderNumber, audio, MessageType.audio, { ptt: true, quoted: message });

                }).catch(response => {
                    conn.sendMessage(senderNumber, `Language code *${language}* not found :(`, MessageType.text, { quoted: message });

                });
                break;
            }

        case "!wikipedia":
        case "!wiki":
            {
                if (!parameters) {
                    conn.sendMessage(senderNumber, "Invalid input bro :)", MessageType.text, { quoted: message });
                    break;
                }

                axios.post("http://salism3api.pythonanywhere.com/wikipedia", { "query": parameters })
                .then(response => {
                    const text = `*${response.data.title}*\n\n${response.data.content}`;
                    conn.sendMessage(senderNumber, text, MessageType.text, { quoted: message });
                })
                .catch(e => {
                    if ([500, 400, 404].includes(e.response.status)) {
                        conn.sendMessage(senderNumber, `Article not found :(`, MessageType.text, { quoted: message });
                    } else {
                        throw e;
                    }
                })
                break;
            }

        case "!textsticker":
        case "!textsticker":
            {
                if (!parameters) {
                    conn.sendMessage(senderNumber, "Invalid input baby :)", MessageType.text, { quoted: message });
                    break;
                }

                const response = await axios.post("https://salism3api.pythonanywhere.com/text2img", { "text": parameter.slice(0.60) });
                const sticker = new WSF.Sticker(response.data.image, { crop: false, pack: "dfkm :)", author: 'Udy' });
                await sticker.build();
                const bufferImage = await sticker.get();
                conn.sendMessage(senderNumber, bufferImage, MessageType.sticker, { quoted: message });
                break;
            }

        case "!ocr":
            {
                if (quotedMessage) {
                    message.message = quotedMessage;
                }

                if (!message.message.imageMessage || message.message.imageMessage.mimetype != "image/jpeg") {
                    conn.sendMessage(senderNumber, "No image :)", MessageType.text, { quoted: message });
                    break;
                }
                const imagePath = await conn.downloadAndSaveMediaMessage(message, Math.floor(Math.random() * 1000000));
                const textImage = (await tesseract.recognize(imagePath)).trim();
                fs.unlinkSync(imagePath)

                conn.sendMessage(senderNumber, textImage, MessageType.text, { quoted: message });
                break;
            }

        case "!gifsticker":
            {
                if (quotedMessage) {
                    message.message = quotedMessage;
                }

                if (!message.message.videoMessage || message.message.videoMessage.mimetype != "video/mp4") {
                    conn.sendMessage(senderNumber, "No video :)", MessageType.text, { quoted: message });
                    break;
                }

                if (message.message.videoMessage.seconds > 8) {
                    conn.sendMessage(senderNumber, "Maximum 8 seconds!", MessageType.text, { quoted: message });
                    break;
                }

                const imagePath = await conn.downloadAndSaveMediaMessage(message, Math.floor(Math.random() * 1000000));
                const sticker = new WSF.Sticker("./" + imagePath, { animated: true, pack: "dfkm :)", author: 'Udy' });
                await sticker.build();
                fs.unlinkSync(imagePath);
                const bufferImage = await sticker.get();
                conn.sendMessage(senderNumber, bufferImage, MessageType.sticker, { quoted: message });
                break;
            }

        case "!giftextsticker":
            {
                if (!parameters) {
                    conn.sendMessage(senderNumber, "Invalid input baby :)", MessageType.text, { quoted: message });
                    break;
                }

                const response = await axios.post("https://salism3api.pythonanywhere.com/text2gif/", { "text": parameter.slice(0.60) });
                let image = await axios.get(response.data.image, { "responseType": "arraybuffer" });
                image = Buffer.from(image.data, "binary");
                image = await webpConverter.gifToWebp(image);
                conn.sendMessage(senderNumber, image, MessageType.sticker, { quoted: message });
                break;
            }


        case "!math":
            {
                const response = await axios.get("https://salism3api.pythonanywhere.com/math/");
                let image = await axios.get(response.data.image, { "responseType": "arraybuffer" });
                image = Buffer.from(image.data, "binary");
                const msg = await conn.sendMessage(senderNumber, image, MessageType.image, { quoted: message, caption: "Reply to this message!" });
                questionAnswer[msg.key.id] = response.data.answer;

                setTimeout(() => {
                    if (questionAnswer[msg.key.id]) {
                        conn.sendMessage(senderNumber, "Timeout!", MessageType.text, { quoted: msg });
                        delete questionAnswer[msg.key.id];
                    }
                }, 600 * 1000);
                break;
            }

        case "!stickernobg":
        case "!stickernobg":
        case "!snobg":
            {
                if (quotedMessage) {
                    message.message = quotedMessage;
                }

                if (!message.message.imageMessage || message.message.imageMessage.mimetype != "image/jpeg") {
                    conn.sendMessage(senderNumber, "No image :)", MessageType.text, { quoted: message });
                    break;
                }

                const image = await conn.downloadMediaMessage(message);
                const imageb64 = image.toString('base64')
                conn.sendMessage(senderNumber, 'Wait!', MessageType.text);
                const data = await axios.post('https://salisganteng.pythonanywhere.com/api/remove-bg', {
                    'api-key': 'salishker',
                    'image': imageb64,
                })

                const sticker = new WSF.Sticker(data.data.image, { crop: false, pack: "dfkm :)", author: 'Udy' });
                await sticker.build();
                const bufferImage = await sticker.get();
                conn.sendMessage(senderNumber, bufferImage, MessageType.sticker, { quoted: message });
                break;
            }
            /**
             * Konversi bahasa planet
             * use: !bplanet g kamu lagi ngapain
             * result: kagamugu lagagigi ngagapagaigin
             **/
        case '!bplanet':
            if (quotedMessage) message.message = quotedMessage
            if (!!parameter) {
                var [alias, ...text] = parameter.split ` `
                text = text.join ` `
                conn['sendMessage'](senderNumber, bahasa_planet(text, alias), 'conversation', {
                    quoted: message
                })
            } else {
                var contoh = '[wrong format]\n\nformat: !bplanet <alias> <text>\ncontoh: !bplanet g kamu lagi ngapain?'
                conn['sendMessage'](senderNumber, contoh, 'conversation', {
                    quoted: message
                })
            }
            break
            defaults: {
                if (quotedMessage && questionAnswer[quotedMessageContext.stanzaId] && textMessage) {
                    const answer = questionAnswer[quotedMessageContext.stanzaId];
                    if (answer == parseInt(textMessage)) {
                        conn.sendMessage(senderNumber, "Cool! correct answer", MessageType.text, { quoted: message });
                        delete questionAnswer[quotedMessageContext.stanzaId];
                    } else {
                        conn.sendMessage(senderNumber, "Wrong answer!", MessageType.text, { quoted: message })
                    }
                } else if (!message.participant && !stickerMessage) {
                    conn.sendMessage(senderNumber, "Unregistered command, send *!help* to see registered commands", MessageType.text, { quoted: message });
                }
            }

    }
}

module.exports = messageHandlerFunction;

// TEST CODE
// I added this section so you can test the output locally
// const dummyConnection = {
//     sendMessage: function (recipient, text, messageType, obj) {
//         console.log(`SENDING "${text}" to ${recipient}.`)
//     },
//     user: {
//         name: "Darah's Sister"
//     }
// };
// const dummyMessage = {
//     key: {
//         remoteJid: 'dummy-remote-jid',
//     },
//     message: {
//         conversation: '!help'
//     }
// };

// messageHandlerFunction(dummyConnection, dummyMessage);
