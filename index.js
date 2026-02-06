// index.js
import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import mongoose from 'mongoose';
import express from 'express';

// ============================
// Config
// ============================
const TOKEN = process.env.BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 3000;
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
// Define Server model inline
// ============================
const serverSchema = new mongoose.Schema({
  discordServerId: { type: String, required: true, unique: true },
  name: String,
  members: Number
  // add any other fields you need
});

const Server = mongoose.model('Server', serverSchema);

// ============================
// Discord Client
// ============================
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const lastMemberCounts = new Map();
const lastUpdateTime = new Map();

async function updateServerMembers(guild) {
  try {
    const now = Date.now();
    if (lastUpdateTime.get(guild.id) && now - lastUpdateTime.get(guild.id) < UPDATE_INTERVAL) return;

    const memberCount = guild.memberCount;
    const previousCount = lastMemberCounts.get(guild.id);
    if (previousCount === memberCount) return;

    // Update Mongo directly (only existing servers)
    const server = await Server.findOne({ discordServerId: guild.id });
    if (!server) return;

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
  setInterval(updateAllServers, 60 * 1000); // every minute
});

client.login(TOKEN);

// ============================
// Express server for Render
// ============================
const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('Bot is running!'));

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
