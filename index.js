import { Client, GatewayIntentBits } from 'discord.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// -----------------
// Discord client
// -----------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// -----------------
// MongoDB setup
// -----------------
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const serverSchema = new mongoose.Schema({
    discordServerId: String,
    members: Number
}, { collection: 'servers' }); // make sure this matches your existing collection

const Server = mongoose.model('Server', serverSchema);

// -----------------
// Helper: update members count
// -----------------
async function updateServerMembers(guild) {
    try {
        const serverDoc = await Server.findOne({ discordServerId: guild.id });
        if (!serverDoc) return; // skip if server not in MongoDB

        // Use guild.memberCount (fast) instead of fetching all members
        serverDoc.members = guild.memberCount;
        await serverDoc.save();

        console.log(`Updated ${guild.name}: ${guild.memberCount} members`);
    } catch (err) {
        console.error(`Failed to update ${guild.name}:`, err.message);
    }
}

// -----------------
// Bot ready
// -----------------
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Update all existing servers on startup
    client.guilds.cache.forEach(updateServerMembers);
});

// -----------------
// Live updates
// -----------------
client.on('guildMemberAdd', async member => {
    try {
        const serverDoc = await Server.findOne({ discordServerId: member.guild.id });
        if (!serverDoc) return;

        serverDoc.members = (serverDoc.members || 0) + 1;
        await serverDoc.save();

        console.log(`Member joined ${member.guild.name}, total: ${serverDoc.members}`);
    } catch (err) {
        console.error(err);
    }
});

client.on('guildMemberRemove', async member => {
    try {
        const serverDoc = await Server.findOne({ discordServerId: member.guild.id });
        if (!serverDoc) return;

        serverDoc.members = Math.max((serverDoc.members || 1) - 1, 0);
        await serverDoc.save();

        console.log(`Member left ${member.guild.name}, total: ${serverDoc.members}`);
    } catch (err) {
        console.error(err);
    }
});

// -----------------
// Login
// -----------------
client.login(process.env.DISCORD_TOKEN);
