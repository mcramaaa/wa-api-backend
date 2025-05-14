const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "WhatsApp Bot API",
      version: "1.0.0",
      description:
        "API untuk mengelola WhatsApp bot menggunakan whatsapp-web.js",
    },
    // servers: [
    //   {
    //     url: "http://localhost:3000",
    //     description: "Local server",
    //   },
    // ],
  },
  apis: ["./index.js"],
};

const specs = swaggerJsdoc(options);
// console.log("Swagger Specs:", JSON.stringify(specs, null, 2)); // Tambahkan log untuk debugging

module.exports = specs;
