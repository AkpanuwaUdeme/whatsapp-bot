// https://github.com/salismazaya/whatsapp-bot
// If you want to change/edit, please don't remove the original github link in the bot, thanks ^_^

const fs = require("fs");
const messageHandler = require("./messageHandler.js");
const http = require("http");
const axios = require("axios");
const qrcode = require("qrcode");
const { WAConnection } = require("@adiwajshing/baileys");

const conn = new WAConnection();
conn.maxCachedMessages = 15;

const server = http.createServer((req, res) => {
    if (req.url == "/") {
        res.end(fs.readFileSync("templates/index.html", "utf-8"));
    } else {
        res.end("404");
    }
})

const io = require("socket.io")(server);
io.on("connection", (socket) => {
    conn.on("qr", async(qr) => {
        const imgURI = await qrcode.toDataURL(qr);
        socket.emit("qr", imgURI);
    });

    conn.on("open", () => {
        socket.emit("connected");
    });
})


server.listen(process.env.PORT || 3000);

conn.on("chat-update", async(message) => {
    try {
        if (!message.hasNewMessage) return;
        message = message.messages.all()[0];
        if (!message.message || message.key.fromMe || message.key && message.key.remoteJid == 'status@broadcast') return;
        if (message.message.ephemeralMessage) {
            message.message = message.message.ephemeralMessage.message;
        }

        await messageHandler(conn, message);
    } catch (e) {
        console.log("[ERROR] " + e.message);
        conn.sendMessage(message.key.remoteJid, "An error occurred! try again later", "conversation", { quoted: message });
    }
});

const start = async() => {
    const version = (await axios.get("https://raw.githubusercontent.com/salismazaya/whatsapp-bot/master/wa-web-version.txt")).data.split(",").map(x => parseInt(x));
    conn.version = version;
    if (fs.existsSync("login.json")) conn.loadAuthInfo("login.json");
    conn.connect()
        .then(() => {
            fs.writeFileSync("login.json", JSON.stringify(conn.base64EncodedAuthInfo()));
            console.log("[OK] Login successful! send !help to display command");
        })
        .catch(e => {
            if (fs.existsSync("login.json")) fs.unlinkSync("login.json");
            console.log("[ERROR] Login failed!");
            conn.clearAuthInfo();
            start();
        });
}
start();