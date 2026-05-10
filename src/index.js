require("dotenv").config();

const { Client, GatewayIntentBits, GatewayDispatchEvents, Collection } = require("discord.js");
const { Riffy } = require("riffy");
const fs = require("fs");
const path = require("path");
const config = require("../config");
const { loadCommands } = require("./handlers/commandHandler");
const { setupPlayerHandler } = require("./handlers/playerHandler");

// --- Create Discord Client ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
    ],
});

// --- Initialize Riffy (Multi-Lavalink) ---
client.riffy = new Riffy(client, config.nodes, {
    send: (payload) => {
        const guild = client.guilds.cache.get(payload.d.guild_id);
        if (guild) guild.shard.send(payload);
    },
    defaultSearchPlatform: config.defaultSearchPlatform || "ytmsearch",
    restVersion: config.restVersion || "v4",
    bypassChecks: {
        nodeFetchInfo: true,
    },
});

// --- Load Commands ---
loadCommands(client);

// --- Load Events ---
const eventsPath = path.join(__dirname, "events");
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter((f) => f.endsWith(".js"));
    for (const file of eventFiles) {
        const event = require(path.join(eventsPath, file));
        if (event.once) {
            client.once(event.name, (...args) => event.execute(client, ...args));
        } else {
            client.on(event.name, (...args) => event.execute(client, ...args));
        }
        console.log(`[Musicify] Loaded event: ${event.name}`);
    }
}

// --- Setup Riffy Player Handler ---
setupPlayerHandler(client);

// --- Global Error Handlers (prevent crashes) ---
process.on("unhandledRejection", (reason, promise) => {
    if (reason && reason.message && reason.message.includes("Queue is empty")) return;
    console.error("[Musicify] Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
    console.error("[Musicify] Uncaught Exception:", error);
});

process.on("uncaughtExceptionMonitor", (error) => {
    console.error("[Musicify] Uncaught Exception (monitor):", error);
});

// --- Riffy error safety ---
client.riffy.on("playerError", (player, error) => {
    console.error(`[Musicify] Player error in ${player.guildId}:`, error);
});

// --- Forward raw voice state to riffy ---
client.on("raw", (d) => {
    if (
        ![
            GatewayDispatchEvents.VoiceStateUpdate,
            GatewayDispatchEvents.VoiceServerUpdate,
        ].includes(d.t)
    )
        return;
    client.riffy.updateVoiceState(d);
});

// --- Login ---
const token = process.env.BOT_TOKEN;
if (!token) {
    console.error("[Musicify] BOT_TOKEN is not set in .env file!");
    process.exit(1);
}

client.login(token);
