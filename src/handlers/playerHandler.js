const { MessageFlags, AttachmentBuilder } = require("discord.js");
const { getGuildData, clearUpdateInterval } = require("../utils/playerStore");
const { createNowPlayingContainer, createChatPlayIdleContainer, createChatPlayNowPlayingContainer } = require("../utils/components");
const { generateMusicCard } = require("../utils/musicard");
const path = require("path");
const fs = require("fs");

const UPDATE_INTERVAL_MS = 15 * 1000; // 15 seconds

/**
 * Helper: edit the existing player message or send a new one (never duplicates)
 */
async function editOrSendPlayerMessage(client, guildData, channelId, container, files) {
    const channel = client.channels.cache.get(channelId);
    if (!channel) {
        // Channel no longer exists; clear stale IDs
        guildData.chatPlayMessageId = null;
        guildData.playerMessageId = null;
        guildData.playerChannelId = null;
        return;
    }

    const messageId = guildData.chatPlayMessageId || guildData.playerMessageId;

    if (messageId) {
        try {
            const msg = await channel.messages.fetch(messageId);
            await msg.edit({
                components: [container],
                files: files,
                flags: MessageFlags.IsComponentsV2,
            });
            return;
        } catch (err) {
            // Message or channel no longer exists — clear stale IDs and send a new one
            guildData.chatPlayMessageId = null;
            guildData.playerMessageId = null;
            guildData.playerChannelId = null;
            guildData.updateInterval && clearInterval(guildData.updateInterval);
            guildData.updateInterval = null;
        }
    }

    try {
        const newMsg = await channel.send({
            components: [container],
            files: files,
            flags: MessageFlags.IsComponentsV2,
        });

        if (guildData.chatPlayChannelId) {
            guildData.chatPlayMessageId = newMsg.id;
        } else {
            guildData.playerMessageId = newMsg.id;
            guildData.playerChannelId = channel.id;
        }
    } catch (sendErr) {
        console.error("[Musicify] Failed to send player message:", sendErr.message);
    }
}

/**
 * Refresh the player message with an updated musicard image
 */
async function refreshPlayerMessage(client, guildId) {
    try {
        const player = client.riffy.players.get(guildId);
        if (!player || !player.current) return;

        const guildData = getGuildData(guildId);
        const track = player.current;

        const musicardBuffer = await generateMusicCard(track, player, guildData);
        const container = guildData.chatPlayChannelId
            ? createChatPlayNowPlayingContainer(track, player, guildData, musicardBuffer)
            : createNowPlayingContainer(track, player, guildData, musicardBuffer);

        const files = [];
        if (musicardBuffer) {
            files.push(new AttachmentBuilder(musicardBuffer, { name: "musicard.png" }));
        }

        const channelId = guildData.chatPlayChannelId || guildData.playerChannelId || player.textChannel;
        await editOrSendPlayerMessage(client, guildData, channelId, container, files);
    } catch (error) {
        console.error("[Musicify] Auto-update error:", error);
    }
}

/**
 * Start the 15-second auto-update interval for a guild
 */
function startUpdateInterval(client, guildId) {
    const guildData = getGuildData(guildId);

    // Clear any existing interval first
    clearUpdateInterval(guildData);

    guildData.updateInterval = setInterval(() => {
        refreshPlayerMessage(client, guildId);
    }, UPDATE_INTERVAL_MS);
}

/**
 * Set up all riffy player event handlers
 */
function setupPlayerHandler(client) {
    if (!client.riffy) {
        console.warn('[Musicify] Riffy client not initialized; player handlers not attached.');
        return;
    }
    // --- Node Connected ---
    client.riffy.on("nodeConnect", (node) => {
        console.log(`[Musicify] Lavalink node "${node.name}" connected.`);
    });

    // --- Node Error ---
    client.riffy.on("nodeError", (node, error) => {
        console.error(`[Musicify] Node "${node.name}" error:`, error.message);
    });

    // --- Node Reconnected (Riffy built-in auto-reconnect) ---
    client.riffy.on("nodeReconnect", (node) => {
        console.log(`[Musicify] Node "${node.name}" reconnected successfully.`);
    });

    // --- Track Start ---
    client.riffy.on("trackStart", async (player, track) => {
        try {
            const guildData = getGuildData(player.guildId);

            // Save the previous track for the "Previous" button
            if (player.previous) {
                guildData.previousTracks.push(player.previous);
                // Keep history limited to 20 tracks to prevent memory bloat
                if (guildData.previousTracks.length > 20) {
                    guildData.previousTracks.shift();
                }
            }

            // Clear any idle timeout
            if (guildData.idleTimeout) {
                clearTimeout(guildData.idleTimeout);
                guildData.idleTimeout = null;
            }

            // Start voice channel monitoring
            startVoiceChannelMonitoring(client, player.guildId);

            // Generate musicard image
            const musicardBuffer = await generateMusicCard(track, player, guildData);

            // Build the container - use ChatPlay version if in ChatPlay channel
            const container = guildData.chatPlayChannelId
                ? createChatPlayNowPlayingContainer(track, player, guildData, musicardBuffer)
                : createNowPlayingContainer(track, player, guildData, musicardBuffer);

            // Prepare files
            const files = [];
            if (musicardBuffer) {
                files.push(new AttachmentBuilder(musicardBuffer, { name: "musicard.png" }));
            }

            // Get the channel
            const channelId = guildData.chatPlayChannelId || guildData.playerChannelId || player.textChannel;
            await editOrSendPlayerMessage(client, guildData, channelId, container, files);

            // Start 15-second auto-update interval
            startUpdateInterval(client, player.guildId);

            // Fetch suggestions for the dropdown
            try {
                const searchQuery = `${track.info.author} ${track.info.title}`;
                const result = await client.riffy.resolve({
                    query: searchQuery,
                    requester: track.info.requester,
                });
                if (result.tracks && result.tracks.length > 1) {
                    guildData.suggestions = result.tracks
                        .filter((t) => t.info.uri !== track.info.uri)
                        .slice(0, 10);
                }
            } catch (err) {
                console.error("[Musicify] Failed to fetch suggestions:", err.message);
            }
        } catch (error) {
            console.error("[Musicify] trackStart error:", error);
        }
    });

    // --- Queue End ---
    client.riffy.on("queueEnd", async (player) => {
        try {
            const guildData = getGuildData(player.guildId);

            // Stop the auto-update interval
            clearUpdateInterval(guildData);

            if (guildData.autoplay) {
                player.autoplay(player);
                return;
            }

            // 24/7 mode: stay in VC, just update the message
            const stayInVC = guildData.twentyFourSeven;

            // If this is a ChatPlay session, edit the message to idle state
            if (guildData.chatPlayChannelId && guildData.chatPlayMessageId) {
                const container = createChatPlayIdleContainer();
                const channel = client.channels.cache.get(guildData.chatPlayChannelId);
                if (channel) {
                    try {
                        const msg = await channel.messages.fetch(guildData.chatPlayMessageId);
                        await msg.edit({
                            components: [container],
                            attachments: [],
                            flags: MessageFlags.IsComponentsV2,
                        });
                    } catch (err) {
                        // message deleted
                    }
                }
            } else if (guildData.playerMessageId && guildData.playerChannelId) {
                // For regular /play: delete the old message
                try {
                    const channel = client.channels.cache.get(guildData.playerChannelId);
                    if (channel) {
                        const msg = await channel.messages.fetch(guildData.playerMessageId);
                        await msg.delete();
                    }
                } catch (err) {
                    // message already deleted
                }
                guildData.playerMessageId = null;
                guildData.playerChannelId = null;
            }

            // If NOT 24/7, disconnect after a delay
            if (!stayInVC) {
                // Clear existing timeout if any
                if (guildData.idleTimeout) clearTimeout(guildData.idleTimeout);
                
                guildData.idleTimeout = setTimeout(() => {
                    try {
                        const currentPlayer = client.riffy.players.get(player.guildId);
                        // Check if player exists and is not actively playing
                        if (currentPlayer && !currentPlayer.playing && !currentPlayer.paused && !currentPlayer.current) {
                            currentPlayer.destroy();
                        }
                    } catch (err) {
                        // player already destroyed
                    }
                    guildData.idleTimeout = null;
                }, 30000); // 30s idle timeout
            }

            // Clear suggestions
            guildData.suggestions = [];
        } catch (error) {
            console.error("[Musicify] queueEnd error:", error);
        }
    });

    // --- Player Disconnect ---
    client.riffy.on("playerDisconnect", (player) => {
        const guildData = getGuildData(player.guildId);
        clearUpdateInterval(guildData);
        stopVoiceChannelMonitoring(player.guildId);
        guildData.playerMessageId = null;
        guildData.playerChannelId = null;
        guildData.suggestions = [];
        guildData.previousTracks = [];
        if (guildData.idleTimeout) clearTimeout(guildData.idleTimeout);
        guildData.idleTimeout = null;
    });

    // --- Track Error / Stuck ---
    client.riffy.on("trackError", async (player, track, payload) => {
        console.error(`[Musicify] Track error in ${player.guildId} for "${track.info.title}":`, payload.error || payload);
        const guildData = getGuildData(player.guildId);
        if (guildData.playerChannelId) {
            const channel = client.channels.cache.get(guildData.playerChannelId);
            if (channel) {
                channel.send(`❌ Failed to play **${track.info.title}** (Lavalink Error). Skipping...`).catch(() => {});
            }
        }
    });

    client.riffy.on("trackStuck", async (player, track, payload) => {
        console.warn(`[Musicify] Track stuck in ${player.guildId} for "${track.info.title}" (${payload.thresholdMs}ms)`);
        const guildData = getGuildData(player.guildId);
        if (guildData.playerChannelId) {
            const channel = client.channels.cache.get(guildData.playerChannelId);
            if (channel) {
                channel.send(`⚠️ Track stuck: **${track.info.title}**. Skipping...`).catch(() => {});
            }
        }
    });
}

/**
 * Start monitoring voice channel for auto-pause/resume functionality
 */
function startVoiceChannelMonitoring(client, guildId) {
    const guildData = getGuildData(guildId);
    
    // Clear existing timeout
    if (guildData.voiceStateTimeout) {
        clearTimeout(guildData.voiceStateTimeout);
    }
    
    // Check voice channel state every 5 seconds
    guildData.voiceStateTimeout = setInterval(() => {
        checkVoiceChannelState(client, guildId);
    }, 5000);
}

/**
 * Check voice channel state and pause/resume accordingly
 */
function checkVoiceChannelState(client, guildId) {
    const guildData = getGuildData(guildId);
    const player = client.riffy.players.get(guildId);
    
    if (!player || !player.voiceChannel) return;
    
    const voiceChannel = client.channels.cache.get(player.voiceChannel);
    if (!voiceChannel) return;
    
    const membersInChannel = voiceChannel.members.filter(member => !member.user.bot);
    const hasUsers = membersInChannel.size > 0;
    
    // Auto-pause when channel becomes empty
    if (!hasUsers && !player.paused && player.playing) {
        player.pause(true);
        guildData.wasPaused = true;
        
        // Send notification to text channel
        if (guildData.playerChannelId) {
            const channel = client.channels.cache.get(guildData.playerChannelId);
            if (channel) {
                channel.send("⏸️ Music paused - voice channel is empty. I'll resume when someone joins!").catch(() => {});
            }
        }
    }
    
    // Auto-resume when users rejoin
    if (hasUsers && guildData.wasPaused && player.paused) {
        player.pause(false);
        guildData.wasPaused = false;
        
        // Send notification to text channel
        if (guildData.playerChannelId) {
            const channel = client.channels.cache.get(guildData.playerChannelId);
            if (channel) {
                channel.send("▶️ Music resumed - welcome back!").catch(() => {});
            }
        }
    }
}

/**
 * Stop voice channel monitoring
 */
function stopVoiceChannelMonitoring(guildId) {
    const guildData = getGuildData(guildId);
    if (guildData.voiceStateTimeout) {
        clearTimeout(guildData.voiceStateTimeout);
        guildData.voiceStateTimeout = null;
    }
}

module.exports = { setupPlayerHandler, startVoiceChannelMonitoring, stopVoiceChannelMonitoring };
