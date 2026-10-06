export interface TelegramSendOptions {
  replyToMessageId?: number;
  parseMode?: "Markdown" | "HTML";
}

export class TelegramClient {
  private botToken: string;

  constructor(botToken?: string) {
    this.botToken = botToken || process.env.TELEGRAM_BOT_TOKEN || "";
    if (!this.botToken && process.env.NODE_ENV !== "test") {
      console.warn("TELEGRAM_BOT_TOKEN is not configured in environment.");
    }
  }

  async sendMessage(chatId: string | number, text: string, options?: TelegramSendOptions): Promise<any> {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    const body: Record<string, any> = {
      chat_id: chatId,
      text,
    };

    if (options?.replyToMessageId) {
      body.reply_to_message_id = options.replyToMessageId;
    }

    if (options?.parseMode) {
      body.parse_mode = options.parseMode;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Failed to send Telegram message:", err);
      throw new Error(`Telegram sendMessage failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.result;
  }

  async getFile(fileId: string): Promise<{ file_path: string }> {
    const url = `https://api.telegram.org/bot${this.botToken}/getFile?file_id=${fileId}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Telegram getFile failed: ${err}`);
    }
    const data = await res.json();
    return data.result;
  }

  async downloadFileAsBase64(filePath: string): Promise<{ base64: string; mimeType: string }> {
    const downloadUrl = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
    const res = await fetch(downloadUrl);
    if (!res.ok) {
      throw new Error(`Failed to download file from Telegram: ${res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    let mimeType = "image/jpeg";
    if (filePath.endsWith(".png")) mimeType = "image/png";
    else if (filePath.endsWith(".webp")) mimeType = "image/webp";

    return { base64, mimeType };
  }
}

export const telegramClient = new TelegramClient();
