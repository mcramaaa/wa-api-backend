const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const { MessageQueue } = require("./messageQueue");
const {
  getOTPTemplate,
  getResetPasswordTemplate,
  getNotificationTemplate,
} = require("./messageTemplates");
const WebSocket = require("ws");
const cors = require("cors");

require("dotenv").config();
const port = process.env.PORT || 8000;
const app = express();
app.use(cors());
app.use(express.json());

// Setup Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Inisialisasi WhatsApp Client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// Inisialisasi antrian pesan
const messageQueue = new MessageQueue(client, 1000); // 1 detik antar pesan

// Fix: Provide a default value for WebSocket port
const wsPort = process.env.WS_PORT || 8080;
const wss = new WebSocket.Server({ port: wsPort });
console.log("WebSocket server berjalan di ws://localhost:" + wsPort);

// Menangani koneksi WebSocket
wss.on("connection", (ws) => {
  console.log("Klien WebSocket terhubung");
  ws.on("close", () => {
    console.log("Klien WebSocket terputus");
  });
});

// Event saat QR code dihasilkan
client.on("qr", (qr) => {
  console.log("QR code baru dihasilkan");
  // Kirim QR code ke semua klien WebSocket yang terhubung
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "qr", data: qr }));
    }
  });
  // Tetap tampilkan QR di terminal
  qrcode.generate(qr, { small: true });
});

// Event saat client siap
client.on("ready", () => {
  console.log("WhatsApp Client siap!");
  // Beritahu klien bahwa autentikasi berhasil
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "status", data: "Client ready" }));
    }
  });
});

// Event saat client gagal autentikasi
client.on("auth_failure", (msg) => {
  console.error("Autentikasi gagal:", msg);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({ type: "error", data: "Authentication failed" })
      );
    }
  });
});

/**
 * @swagger
 * /api/check-number/{number}:
 *   get:
 *     summary: Cek apakah nomor terdaftar di WhatsApp
 *     parameters:
 *       - in: path
 *         name: number
 *         required: true
 *         description: Nomor telepon untuk dicek (misalnya 08123456789)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Berhasil mengecek nomor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 registered:
 *                   type: boolean
 *                 number:
 *                   type: string
 *       500:
 *         description: Error server
 */
app.get("/api/check-number/:number", async (req, res) => {
  try {
    const number = req.params.number;
    const formattedNumber = number.startsWith("0")
      ? `62${number.slice(1)}@c.us`
      : `${number}@c.us`;
    const isRegistered = await client.isRegisteredUser(formattedNumber);

    if (isRegistered) {
      res.json({ status: "success", registered: true, number });
    } else {
      res.json({ status: "success", registered: false, number });
    }
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * @swagger
 * /api/send-otp:
 *   post:
 *     summary: Kirim kode OTP ke nomor tertentu
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               number:
 *                 type: string
 *                 description: Nomor telepon (misalnya 08123456789)
 *               otp:
 *                 type: string
 *                 description: Kode OTP yang akan dikirim
 *     responses:
 *       200:
 *         description: OTP berhasil dikirim
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Data input tidak valid
 *       500:
 *         description: Error server
 */
app.post("/api/send-otp", async (req, res) => {
  try {
    const { number, otp } = req.body;
    if (!number || !otp) {
      return res
        .status(400)
        .json({ status: "error", message: "Number and OTP required" });
    }

    const formattedNumber = number.startsWith("0")
      ? `62${number.slice(1)}@c.us`
      : `${number}@c.us`;
    const message = getOTPTemplate(otp);

    await messageQueue.addMessage(formattedNumber, message);
    res.json({ status: "success", message: "OTP queued for sending" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * @swagger
 * /api/send-reset-password:
 *   post:
 *     summary: Kirim link reset password ke nomor tertentu
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               number:
 *                 type: string
 *                 description: Nomor telepon (misalnya 08123456789)
 *               resetLink:
 *                 type: string
 *                 description: Link untuk reset password
 *     responses:
 *       200:
 *         description: Link reset password berhasil dikirim
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Data input tidak valid
 *       500:
 *         description: Error server
 */
app.post("/api/send-reset-password", async (req, res) => {
  try {
    const { number, resetLink } = req.body;
    if (!number || !resetLink) {
      return res
        .status(400)
        .json({ status: "error", message: "Number and reset link required" });
    }

    const formattedNumber = number.startsWith("0")
      ? `62${number.slice(1)}@c.us`
      : `${number}@c.us`;
    const message = getResetPasswordTemplate(resetLink);

    await messageQueue.addMessage(formattedNumber, message);
    res.json({
      status: "success",
      message: "Reset password link queued for sending",
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * @swagger
 * /api/send-notification:
 *   post:
 *     summary: Kirim notifikasi ke nomor tertentu
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               number:
 *                 type: string
 *                 description: Nomor telepon (misalnya 08123456789)
 *               message:
 *                 type: string
 *                 description: Pesan notifikasi
 *     responses:
 *       200:
 *         description: Notifikasi berhasil dikirim
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Data input tidak valid
 *       500:
 *         description: Error server
 */
app.post("/api/send-notification", async (req, res) => {
  try {
    const { number, message } = req.body;
    if (!number || !message) {
      return res
        .status(400)
        .json({ status: "error", message: "Number and message required" });
    }

    const formattedNumber = number.startsWith("0")
      ? `62${number.slice(1)}@c.us`
      : `${number}@c.us`;
    const formattedMessage = getNotificationTemplate(message);

    await messageQueue.addMessage(formattedNumber, formattedMessage);
    res.json({ status: "success", message: "Notification queued for sending" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * @swagger
 * /api/send-message:
 *   post:
 *     summary: Kirim message ke nomor tertentu
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               number:
 *                 type: string
 *                 description: Nomor telepon (misalnya 08123456789)
 *               message:
 *                 type: string
 *                 description: Pesan
 *     responses:
 *       200:
 *         description: Notifikasi berhasil dikirim
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Data input tidak valid
 *       500:
 *         description: Error server
 */
app.post("/api/send-message", async (req, res) => {
  try {
    const { number, message } = req.body;
    console.log("number", number);
    console.log("message", message);
    if (!number || !message) {
      return res
        .status(400)
        .json({ status: "error", message: "Number and message required" });
    }

    const formattedNumber = number.startsWith("0")
      ? `62${number.slice(1)}@c.us`
      : `${number}@c.us`;

    await messageQueue.addMessage(formattedNumber, message);
    res.json({ status: "success", message: "Message queued for sending" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Jalankan server dan client
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
  console.log(`Swagger UI tersedia di http://localhost:${port}/api-docs`);
  client.initialize();
});
