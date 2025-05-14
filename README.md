# 🟢 WA-BOT

WA-BOT adalah WhatsApp Bot berbasis Node.js yang menyediakan API untuk mengirim pesan seperti OTP, link reset password, dan notifikasi ke pengguna melalui WhatsApp.

Dibangun menggunakan:
- `whatsapp-web.js` untuk integrasi WhatsApp Web
- `Express` untuk REST API
- `Swagger` untuk dokumentasi API
- `WebSocket (ws)` untuk komunikasi real-time
- `dotenv` untuk environment configuration

## 🚀 Fitur

- Kirim pesan WhatsApp ke nomor tertentu
- Template pesan (OTP, reset password, dll.)
- Dokumentasi API otomatis dengan Swagger
- Dukungan WebSocket untuk komunikasi dua arah

## ⚙️ Instalasi

git clone https://github.com/username/wa-bot.git
cd wa-bot

yarn install
# atau
npm install

Buat .env file
PORT=9000
WS_PORT=9001


## Dokumentasi Api
http://localhost:port/api-docs
