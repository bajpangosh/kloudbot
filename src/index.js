require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios'); // Import axios
const { getServerDetails } = require('./hetzner/api');

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
  polling: {
    autoStart: true,
    interval: 300,
    params: {
      timeout: 10
    }
  },
  cancellation: true // Enable promise cancellation manually
});

// Function to fetch projects using API tokens from .env
async function fetchProjects(apiToken) {
  try {
    const response = await axios.get('https://api.hetzner.cloud/v1/projects', {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
    console.log('Fetched projects:', response.data.projects); // Debugging log
    return response.data.projects;
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

// Function to fetch projects
async function fetchProjectsForStatus() {
  try {
    const response = await axios.get('https://api.hetzner.cloud/v1/projects', {
      headers: {
        'Authorization': `Bearer ${process.env.HETZNER_API_TOKEN_PROJECT1}` // Use an appropriate token
      }
    });
    return response.data.projects;
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `Welcome to the Hetzner Cloud Management Bot!\n\n` +
                         `Here are the available commands:\n` +
                         `/status - Get the status of servers for a specific project.\n` +
                         `/reboot <server_name> - Reboot a specific server.\n` +
                         `/shutdown <server_name> - Shutdown a specific server.\n` +
                         `/start <server_name> - Start a stopped server.\n` +
                         `/pricing - List the cost of all active servers in INR.\n` +
                         `/resources <server_name> - Display real-time CPU, RAM, and disk usage.\n` +
                         `/resize <server_name> <new_plan> - Resize a server to a new plan.\n` +
                         `/add_user <username> <role> - Add a new user to the project.\n` +
                         `/remove_user <username> - Remove a user from the project.\n` +
                         `/project - Provide details about the Hetzner project.\n` +
                         `/list - List all projects.\n\n` +
                         `Connected Projects:\n` +
                         `- PROJECT1\n` +
                         `- PROJECT2\n`;
  bot.sendMessage(chatId, welcomeMessage);
});

// Update the /status command to use dynamic project names
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const projects = await fetchProjectsForStatus();
  const keyboard = projects.map(project => [{ text: project.name, callback_data: `status_${project.id}` }]);
  const options = {
    reply_markup: JSON.stringify({
      inline_keyboard: keyboard
    })
  };
  bot.sendMessage(chatId, 'Choose a project to view server status:', options);
});

// List command to show projects
bot.onText(/\/list/, async (msg) => {
  const chatId = msg.chat.id;
  const apiTokens = [process.env.HETZNER_API_TOKEN_PROJECT1, process.env.HETZNER_API_TOKEN_PROJECT2]; // Add more if needed
  let allProjects = [];

  for (const token of apiTokens) {
    const projects = await fetchProjects(token);
    allProjects = allProjects.concat(projects);
  }

  if (allProjects.length === 0) {
    bot.sendMessage(chatId, 'No projects found.');
    return;
  }

  const keyboard = allProjects.map(project => [{ text: project.name, callback_data: `status_${project.id}` }]);
  const options = {
    reply_markup: JSON.stringify({
      inline_keyboard: keyboard
    })
  };
  bot.sendMessage(chatId, 'Choose a project to view details:', options);
});

// Handling callback queries for selected projects
bot.on('callback_query', async (callbackQuery) => {
  const message = callbackQuery.message;
  const projectId = callbackQuery.data.split('_')[1]; // Extract project ID
  try {
    const servers = await getServerDetails(projectId);
    let response = `Server Details for project:\n`;
    servers.forEach(server => {
      response += `Name: ${server.name}\nStatus: ${server.status}\n`;
    });
    bot.sendMessage(message.chat.id, response);
  } catch (error) {
    bot.sendMessage(message.chat.id, `Error fetching server details: ${error.message}`);
  }
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
      const ipv4 = server.public_net && server.public_net.ipv4 ? server.public_net.ipv4.ip : 'N/A';
      message += `\nName: ${server.name}\n` +
                 `Status: ${server.status}\n` +
                 `IPv4: ${ipv4}\n` +
                 `Monthly Price: ₹${priceInINR.toFixed(2)}\n`;
    });
    bot.sendMessage(chatId, message);
  } catch (error) {
    bot.sendMessage(chatId, `Error fetching server details for project ${project}: ` + error.message);
  }
});

bot.on('message', (msg) => {
  console.log('Received message:', msg.text); // Debugging log
  const chatId = msg.chat.id;
  if (!msg.text.startsWith('/')) {
    bot.sendMessage(chatId, "I didn't understand that command. Please try again.");
  }
});
