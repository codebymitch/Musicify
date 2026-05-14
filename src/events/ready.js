const { REST, Routes, ActivityType } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { readDB } = require("../utils/database");
const { getGuildData } = require("../utils/playerStore");

module.exports = {
    name: "clientReady",
    once: true,
    async execute(client) {
        console.log(`[Musicify] Logged in as ${client.user.tag}`);
        console.log(`[Musicify] Serving ${client.guilds.cache.size} guild(s)`);

        // Initialize riffy with bot user ID
        client.riffy.init(client.user.id);

        // Cycling statuses
        const statuses = [
            "Pretending to be a DJ",
            "/help for commands",
            "Spinning tracks for servers",
            "ChatPlay mode activated",
            "Bass boosting servers",
            "Now playing: your favorite songs",
        ];

        // Set initial activity
        client.user.setPresence({
            activities: [{ name: statuses[0], type: ActivityType.Playing }],
            status: "online",
        });

        let statusIndex = 0;
        setInterval(() => {
            statusIndex = (statusIndex + 1) % statuses.length;
            client.user.setPresence({
                activities: [{ name: statuses[statusIndex], type: ActivityType.Playing }],
                status: "online",
            });
        }, 120000); // 2 minutes

        // --- Restore ChatPlay channels from JSON database ---
        try {
            const db = readDB();
            let restoredCount = 0;

            for (const [guildId, settings] of Object.entries(db)) {
                const guild = client.guilds.cache.get(guildId);
                if (!guild) continue;

                const guildData = getGuildData(guildId);

                // Restore ChatPlay state
                if (settings.chatPlayChannelId) {
                    guildData.chatPlayChannelId = settings.chatPlayChannelId;
                    guildData.chatPlayMessageId = settings.chatPlayMessageId || null;
                    guildData.chatPlayEnabled = settings.chatPlayEnabled !== false;
                    guildData.playerChannelId = settings.chatPlayChannelId;
                    restoredCount++;
                }

                // Restore 24/7 mode
                if (settings.twentyFourSeven) {
                    guildData.twentyFourSeven = true;
                }
            }

            if (restoredCount > 0) {
                console.log(`[Musicify] Restored ChatPlay for ${restoredCount} guild(s) from database.`);
            }
        } catch (err) {
            console.error("[Musicify] Failed to restore from database:", err.message);
        }

        // --- Auto-deploy slash commands ---
        try {
            const commands = [];
            const commandsPath = path.join(__dirname, "..", "commands");
            const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"));

            for (const file of commandFiles) {
                const command = require(path.join(commandsPath, file));
                if (command.data) {
                    commands.push(command.data.toJSON());
                }
            }

            const rest = new REST({ version: "10" }).setToken(client.token);
            await rest.put(Routes.applicationCommands(client.user.id), {
                body: commands,
            });

            console.log(`[Musicify] Auto-deployed ${commands.length} slash commands.`);
        } catch (error) {
            console.error("[Musicify] Failed to auto-deploy commands:", error);
        }
    },
};
