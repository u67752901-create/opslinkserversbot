// index.js
import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import fetch from 'node-fetch';
import express from 'express';

const app = express();
app.use(express.json());

// ============================
// Config
// ============================
const TOKEN = process.env.BOT_TOKEN; // your Discord bot token
const API_URL = process.env.API_URL; // your website URL e.g., https://your-site.onrender.com
const PORT = process.env.PORT || 3000; // Render requires PORT

const UPDATE_INTERVAL = 2 * 60 * 1000; // 2 minutes per server minimum

// ============================
// Discord Client
// ============================
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// Keep track of last member count per server
const lastMemberCounts = new Map();
const lastUpdateTime = new Map();

// Function to update a server's member count
async function updateServerMembers(guild) {
  try {
    const now = Date.now();

    // Only update if enough time has passed
    if (lastUpdateTime.get(guild.id) && now - lastUpdateTime.get(guild.id) < UPDATE_INTERVAL) {
      return;
    }

    const memberCount = guild.memberCount;
    const previousCount = lastMemberCounts.get(guild.id);

    // Only update if member count changed
    if (previousCount === memberCount) return;

    const res = await fetch(`${API_URL}/servers/${guild.id}/updateMembers`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ members: memberCount })
    });

    if (!res.ok) {
      console.error(`Failed to update ${guild.name}:`, await res.text());
      return;
    }

    console.log(`Updated ${guild.name} members: ${memberCount}`);
    lastMemberCounts.set(guild.id, memberCount);
    lastUpdateTime.set(guild.id, now);
  } catch (err) {
    console.error('Error updating members:', err);
  }
}

// Function to loop through all guilds
function updateAllServers() {
  client.guilds.cache.forEach(updateServerMembers);
}

// When the bot is ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  // Initial update on startup
  updateAllServers();
  // Interval to check servers every minute
  setInterval(updateAllServers, 60 * 1000);
});

// Log in to Discord
client.login(TOKEN);

// ============================
// Express server (Render requirement)
// ============================
app.get('/', (req, res) => {
  res.send('Bot is running!');
});

app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
});
