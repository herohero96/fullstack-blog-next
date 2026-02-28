/**
 * Telegram 一键分发工具
 */
export async function sendToTelegram(message: string): Promise<boolean> {
  // 这里直接使用 OpenClaw 注入的环境变量或配置
  // 注意：在 Vercel 运行时需要配置这些环境变量
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error('Missing Telegram configuration');
    return false;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
    return res.ok;
  } catch (error) {
    console.error('Telegram send failed:', error);
    return false;
  }
}
