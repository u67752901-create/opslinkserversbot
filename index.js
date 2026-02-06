// index.js
import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import mongoose from 'mongoose';
import express from 'express';
import Server from './models/Server.js'; // Your existing Server model

// ============================
// Config
// ============================
const TOKEN = process.env.BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 3000; // Render requires PORT
const UPDATE_INTERVAL = 2 * 60 * 1000; // 2 minutes per server minimum

// ============================
// Connect to Mongo
// ============================
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// ============================
// Discord Client
// ============================
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Track last member counts to avoid unnecessary updates
const lastMemberCounts = new Map();
const lastUpdateTime = new Map();

async function updateServerMembers(guild) {
  try {
    const now = Date.now();

    // Only update if interval has passed
    if (lastUpdateTime.get(guild.id) && now - lastUpdateTime.get(guild.id) < UPDATE_INTERVAL) return;

    const memberCount = guild.memberCount;
    const previousCount = lastMemberCounts.get(guild.id);

    // Only update if member count changed
    if (previousCount === memberCount) return;

    // Update Mongo directly, only existing servers
    const server = await Server.findOne({ discordServerId: guild.id });
    if (!server) return; // do not create new collection

    server.members = memberCount;
    await server.save();

    console.log(`Updated ${guild.name} members: ${memberCount}`);
    lastMemberCounts.set(guild.id, memberCount);
    lastUpdateTime.set(guild.id, now);
  } catch (err) {
    console.error(`Error updating ${guild.name}:`, err);
  }
}

function updateAllServers() {
  client.guilds.cache.forEach(updateServerMembers);
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  updateAllServers();
  setInterval(updateAllServers, 60 * 1000); // loop every minute
});

client.login(TOKEN);

// ============================
// Minimal Express for Render
// ============================
const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('Bot is running!'));

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
