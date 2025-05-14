class MessageQueue {
  constructor(client, interval) {
    this.client = client;
    this.interval = interval;
    this.queue = [];
    this.isProcessing = false;
  }

  async addMessage(number, message) {
    this.queue.push({ number, message });
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  async processQueue() {
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const { number, message } = this.queue.shift();
      try {
        await this.client.sendMessage(number, message);
        console.log(`Pesan terkirim ke ${number}`);
      } catch (error) {
        console.error(`Gagal mengirim pesan ke ${number}:`, error);
      }
      await new Promise((resolve) => setTimeout(resolve, this.interval));
    }

    this.isProcessing = false;
  }
}

module.exports = { MessageQueue };
