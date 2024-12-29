require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { getServerDetails } = require('./hetzner/api');

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome to the Hetzner Cloud Management Bot!");
});

bot.onText(/\/status (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const project = match[1]; // Extract the project name from the command
  try {
    const servers = await getServerDetails(project);
    if (servers.length === 0) {
      bot.sendMessage(chatId, `No servers found for project ${project}.`);
      return;
    }
    let message = `Server Details for project ${project}:\n`;
    servers.forEach(server => {
      const priceInINR = server.server_type.prices[0].price_monthly.gross * 90; // Convert to INR
      message += `\nName: ${server.name}\n` +
                 `Status: ${server.status}\n` +
                 `IPv4: ${server.public_net.ipv4.ip}\n` +
                 `IPv6: ${server.public_net.ipv6.ip}\n` +
                 `Monthly Price: ₹${priceInINR.toFixed(2)}\n`;
    });
    bot.sendMessage(chatId, message);
  } catch (error) {
    bot.sendMessage(chatId, `Error fetching server details for project ${project}: ` + error.message);
  }
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  // Send a default message for unrecognized commands
  bot.sendMessage(chatId, "I didn't understand that command. Please try again.");
});
