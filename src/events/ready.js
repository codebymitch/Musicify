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
            let invalidMessages = 0;

            for (const [guildId, settings] of Object.entries(db)) {
                const guild = client.guilds.cache.get(guildId);
                if (!guild) continue;

                const guildData = getGuildData(guildId);

                // Restore ChatPlay state with message validation
                if (settings.chatPlayChannelId) {
                    guildData.chatPlayChannelId = settings.chatPlayChannelId;
                    guildData.chatPlayEnabled = settings.chatPlayEnabled !== false;
                    guildData.playerChannelId = settings.chatPlayChannelId;

                    // Validate if the saved message still exists
                    if (settings.chatPlayMessageId) {
                        try {
                            const channel = client.channels.cache.get(settings.chatPlayChannelId);
                            if (channel) {
                                await channel.messages.fetch(settings.chatPlayMessageId);
                                guildData.chatPlayMessageId = settings.chatPlayMessageId;
                            } else {
                                guildData.chatPlayMessageId = null;
                                invalidMessages++;
                            }
                        } catch (err) {
                            // Message doesn't exist anymore
                            guildData.chatPlayMessageId = null;
                            invalidMessages++;
                        }
                    } else {
                        guildData.chatPlayMessageId = null;
                    }

                    // If message is invalid, create a new idle message
                    if (!guildData.chatPlayMessageId && guildData.chatPlayEnabled) {
                        try {
                            const { createChatPlayIdleContainer } = require("../utils/components");
                            const container = createChatPlayIdleContainer();
                            const channel = client.channels.cache.get(settings.chatPlayChannelId);
                            if (channel) {
                                const chatMsg = await channel.send({
                                    components: [container],
                                    flags: MessageFlags.IsComponentsV2,
                                });
                                guildData.chatPlayMessageId = chatMsg.id;
                                // Update database with new message ID
                                const { setGuildSetting } = require("../utils/database");
                                setGuildSetting(guildId, "chatPlayMessageId", chatMsg.id);
                            }
                        } catch (err) {
                            console.error(`[Musicify] Failed to recreate ChatPlay message for guild ${guildId}:`, err.message);
                        }
                    }

                    restoredCount++;
                }

                // Restore 24/7 mode
                if (settings.twentyFourSeven) {
                    guildData.twentyFourSeven = true;
                }
            }

            if (restoredCount > 0) {
                console.log(`[Musicify] Restored ChatPlay for ${restoredCount} guild(s) from database.`);
                if (invalidMessages > 0) {
                    console.log(`[Musicify] Recreated ${invalidMessages} invalid ChatPlay message(s).`);
                }
                
                // Update existing ChatPlay messages if bot was restarted during playback
                setTimeout(async () => {
                    for (const [guildId, settings] of Object.entries(db)) {
                        if (settings.chatPlayChannelId && settings.chatPlayEnabled) {
                            const guildData = getGuildData(guildId);
                            const player = client.riffy.players.get(guildId);
                            
                            // If player exists and is playing, update the ChatPlay message
                            if (player && player.current && guildData.chatPlayMessageId) {
                                try {
                                    const { createChatPlayNowPlayingContainer } = require("../utils/components");
                                    const { generateMusicCard } = require("../utils/musicard");
                                    const { AttachmentBuilder } = require("discord.js");
                                    
                                    const musicardBuffer = await generateMusicCard(player.current, player, guildData);
                                    const container = createChatPlayNowPlayingContainer(player.current, player, guildData, musicardBuffer);
                                    
                                    const files = [];
                                    if (musicardBuffer) {
                                        files.push(new AttachmentBuilder(musicardBuffer, { name: "musicard.png" }));
                                    }
                                    
                                    const channel = client.channels.cache.get(settings.chatPlayChannelId);
                                    if (channel) {
                                        await channel.messages.fetch(guildData.chatPlayMessageId).then(async (msg) => {
                                            await msg.edit({
                                                components: [container],
                                                files: files,
                                                flags: MessageFlags.IsComponentsV2,
                                            });
                                        }).catch(() => {
                                            // Message doesn't exist, will be handled by next chatplay interaction
                                        });
                                    }
                                } catch (err) {
                                    console.error(`[Musicify] Failed to update ChatPlay message for guild ${guildId}:`, err.message);
                                }
                            }
                        }
                    }
                }, 2000); // Wait 2 seconds for Lavalink to be fully connected
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
