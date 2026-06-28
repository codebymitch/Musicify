const { MessageFlags, AttachmentBuilder, ChannelType } = require("discord.js");
const { getGuildData, clearUpdateInterval, resetPlayerState } = require("../utils/playerStore");
const { createNowPlayingContainer, createChatPlayNowPlayingContainer, createQueueContainer, createChatPlayIdleContainer } = require("../utils/components");
const { generateMusicCard } = require("../utils/musicard");
const { addNodeDetails } = require("../utils/nodeDetails");
const { canControlMusic, VOICE_CHANNEL_DENIAL } = require("../utils/permissions");
const { cleanupPlayerUI } = require("../utils/cleanup");
const { setGuildSetting, deleteGuildSetting } = require("../utils/database");
const config = require("../../config");

/**
 * Cache for application command IDs — populated once, reused everywhere.
 */
let cachedCommands = null;
let commandCacheExpiry = 0;

async function getCachedCommands(client) {
    const now = Date.now();
    // Re-fetch every 30 minutes
    if (cachedCommands && now < commandCacheExpiry) return cachedCommands;
    try {
        cachedCommands = await client.application.commands.fetch();
        commandCacheExpiry = now + 30 * 60 * 1000;
    } catch (e) {
        cachedCommands = null;
    }
    return cachedCommands;
}

function getCmd(commands, name, subcommand = null) {
    const cmd = commands?.find(c => c.name === name);
    if (!cmd) return subcommand ? `\`/${name} ${subcommand}\`` : `\`/${name}\``;
    return subcommand ? `</${name} ${subcommand}:${cmd.id}>` : `</${name}:${cmd.id}>`;
}

/**
 * Handle all button and select menu interactions from the player container
 */
async function handleButtonInteraction(client, interaction) {
    if (!client.riffy) {
        console.warn('[Musicify] Riffy client not initialized; button handler ignored.');
        return;
    }

    const commands = await getCachedCommands(client);
    const cmd = (name, sub) => getCmd(commands, name, sub);

    const guildId = interaction.guild.id;
    let player = client.riffy.players.get(guildId);
    const guildData = getGuildData(guildId);

    // If no player exists but ChatPlay was active, try to recreate it
    if (!player && guildData.chatPlayChannelId && guildData.chatPlayEnabled) {
        const voiceChannel = interaction.member?.voice?.channel;
        if (voiceChannel) {
            try {
                player = client.riffy.createConnection({
                    guildId: guildId,
                    voiceChannel: voiceChannel.id,
                    textChannel: guildData.chatPlayChannelId,
                    deaf: true,
                });
                player.setVolume(guildData.volume);
                console.log(`[Musicify] Recreated player for guild ${guildId} after restart`);
            } catch (err) {
                console.error(`[Musicify] Failed to recreate player for guild ${guildId}:`, err.message);
            }
        }
    }

    // ─── Onboard: Text Channel Select ─────────────────────────────
    if (interaction.isChannelSelectMenu() && interaction.customId === "onboard_text_select") {
        await interaction.deferUpdate();

        const selectedChannelId = interaction.values[0];

        // Delete old ChatPlay message if it exists
        if (guildData.chatPlayChannelId && guildData.chatPlayMessageId) {
            try {
                const oldChannel = client.channels.cache.get(guildData.chatPlayChannelId);
                if (oldChannel) {
                    const oldMsg = await oldChannel.messages.fetch(guildData.chatPlayMessageId);
                    await oldMsg.delete();
                }
            } catch (err) { /* ignore */ }
        }

        // Send new ChatPlay idle message in selected channel
        const selectedChannel = client.channels.cache.get(selectedChannelId);
        if (selectedChannel) {
            try {
                const idleContainer = createChatPlayIdleContainer();
                const chatMsg = await selectedChannel.send({
                    components: [idleContainer],
                    flags: MessageFlags.IsComponentsV2,
                });

                // Set slowmode
                try {
                    await selectedChannel.setRateLimitPerUser(5, "ChatPlay setup - prevents spam");
                } catch (err) { /* may lack permission */ }

                guildData.chatPlayChannelId = selectedChannelId;
                guildData.chatPlayMessageId = chatMsg.id;
                guildData.chatPlayEnabled = true;
                guildData.playerChannelId = selectedChannelId;

                setGuildSetting(guildId, "chatPlayChannelId", selectedChannelId);
                setGuildSetting(guildId, "chatPlayMessageId", chatMsg.id);
                setGuildSetting(guildId, "chatPlayEnabled", true);
            } catch (err) {
                console.error("[Musicify] Onboard text setup error:", err.message);
            }
        }

        // Refresh the panel
        const { buildOnboardPanel } = require("../commands/onboard");
        try {
            await interaction.editReply({
                components: [buildOnboardPanel(client, guildData)],
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (err) { /* ignore */ }
        return;
    }

    // ─── Onboard: Voice Channel Select ────────────────────────────
    if (interaction.isChannelSelectMenu() && interaction.customId === "onboard_voice_select") {
        await interaction.deferUpdate();

        const selectedVcId = interaction.values[0];
        guildData.defaultVoiceChannel = selectedVcId;
        setGuildSetting(guildId, "defaultVoiceChannel", selectedVcId);

        // If 24/7 is enabled, join the VC immediately
        if (guildData.twentyFourSeven) {
            try {
                const textChannel = guildData.chatPlayChannelId || interaction.channel.id;
                let existingPlayer = client.riffy.players.get(guildId);
                if (!existingPlayer) {
                    client.riffy.createConnection({
                        guildId: guildId,
                        voiceChannel: selectedVcId,
                        textChannel: textChannel,
                        deaf: true,
                    });
                }
            } catch (err) {
                console.error("[Musicify] Failed to join VC on onboard:", err.message);
            }
        }

        // Refresh the panel
        const { buildOnboardPanel } = require("../commands/onboard");
        try {
            await interaction.editReply({
                components: [buildOnboardPanel(client, guildData)],
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (err) { /* ignore */ }
        return;
    }

    // ─── Onboard: 24/7 Toggle ─────────────────────────────────────
    if (interaction.isButton() && interaction.customId === "onboard_247") {
        await interaction.deferUpdate();

        const newState = !guildData.twentyFourSeven;
        guildData.twentyFourSeven = newState;
        setGuildSetting(guildId, "twentyFourSeven", newState);

        if (newState && guildData.defaultVoiceChannel) {
            // Join the VC
            try {
                let existingPlayer = client.riffy.players.get(guildId);
                if (!existingPlayer) {
                    const textChannel = guildData.chatPlayChannelId || interaction.channel.id;
                    client.riffy.createConnection({
                        guildId: guildId,
                        voiceChannel: guildData.defaultVoiceChannel,
                        textChannel: textChannel,
                        deaf: true,
                    });
                }
            } catch (err) {
                console.error("[Musicify] Failed to join VC on 24/7 enable:", err.message);
            }
        } else if (!newState) {
            // If not playing anything, disconnect
            const existingPlayer = client.riffy.players.get(guildId);
            if (existingPlayer && !existingPlayer.playing && !existingPlayer.paused) {
                existingPlayer.destroy();
            }
        }

        // Refresh the panel
        const { buildOnboardPanel } = require("../commands/onboard");
        try {
            await interaction.editReply({
                components: [buildOnboardPanel(client, guildData)],
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (err) { /* ignore */ }
        return;
    }

    // ─── Onboard: Reset ───────────────────────────────────────────
    if (interaction.isButton() && interaction.customId === "onboard_reset") {
        await interaction.deferUpdate();

        // Delete ChatPlay message
        if (guildData.chatPlayChannelId && guildData.chatPlayMessageId) {
            try {
                const channel = client.channels.cache.get(guildData.chatPlayChannelId);
                if (channel) {
                    const msg = await channel.messages.fetch(guildData.chatPlayMessageId);
                    await msg.delete();
                }
            } catch (err) { /* ignore */ }

            // Remove slowmode
            try {
                const channel = client.channels.cache.get(guildData.chatPlayChannelId);
                if (channel) await channel.setRateLimitPerUser(0, "ChatPlay removed");
            } catch (err) { /* ignore */ }
        }

        // Clear state
        guildData.chatPlayChannelId = null;
        guildData.chatPlayMessageId = null;
        guildData.chatPlayEnabled = false;
        guildData.defaultVoiceChannel = null;
        guildData.twentyFourSeven = false;

        // Clear database
        deleteGuildSetting(guildId, "chatPlayChannelId");
        deleteGuildSetting(guildId, "chatPlayMessageId");
        deleteGuildSetting(guildId, "chatPlayEnabled");
        deleteGuildSetting(guildId, "defaultVoiceChannel");
        deleteGuildSetting(guildId, "twentyFourSeven");

        // Disconnect if not playing
        const existingPlayer = client.riffy.players.get(guildId);
        if (existingPlayer && !existingPlayer.playing && !existingPlayer.paused) {
            existingPlayer.destroy();
        }

        // Refresh the panel
        const { buildOnboardPanel } = require("../commands/onboard");
        try {
            await interaction.editReply({
                components: [buildOnboardPanel(client, guildData)],
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (err) { /* ignore */ }
        return;
    }

    // ─── Node Stats Dropdown ──────────────────────────────────────
    if (interaction.isStringSelectMenu() && interaction.customId === "node_stats_select") {
        await interaction.deferUpdate();

        const selectedValue = interaction.values[0];
        const nodeIndex = parseInt(selectedValue.replace("node_", ""), 10);
        const configNode = config.nodes[nodeIndex];
        if (!configNode) return;

        const nodes = client.riffy.nodeMap;
        const nodeList = Array.isArray(nodes)
            ? nodes
            : nodes instanceof Map
              ? [...nodes.values()]
              : Object.values(nodes || {});
        const connectedNode = nodeList.find(n => n.name === configNode.name);
        const connected = connectedNode?.connected || connectedNode?.isConnected || false;

        const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

        const statusEmoji = connected ? "🟢" : "🔴";
        const statusText = connected ? "Connected" : "Disconnected";
        const container = new ContainerBuilder();
        const displayName = nodeIndex === 0 ? "Main Node" : `Node ${nodeIndex}`;

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `## ${statusEmoji} ${displayName}\n` +
                `-# ${statusText}`
            )
        );

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        if (!connected || !connectedNode?.stats) {
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent("-# *Node is offline — no stats available.*")
            );
        } else {
            const stats = connectedNode.stats;
            const cpuCores = stats.cpu?.cores || "N/A";
            const sysLoad = stats.cpu ? `${(stats.cpu.systemLoad * 100).toFixed(1)}%` : "N/A";
            const llLoad = stats.cpu ? `${(stats.cpu.lavalinkLoad * 100).toFixed(1)}%` : "N/A";

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# Rest Version: ${connectedNode.restVersion || "N/A"}\n\n` +
                    `**Players**\n` +
                    `-# 🎶 Active: ${stats.playingPlayers || 0}  •  📻 Total: ${stats.players || 0}\n\n` +
                    `**CPU**\n` +
                    `-# 🖥️ Cores: ${cpuCores}  •  ⚙️ System: ${sysLoad}  •  🔧 Lavalink: ${llLoad}`
                )
            );
        }

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));

        const backButton = new ButtonBuilder()
            .setCustomId("status_back")
            .setEmoji("⬅️")
            .setStyle(ButtonStyle.Secondary);

        container.addActionRowComponents(new ActionRowBuilder().addComponents(backButton));

        try {
            await interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (err) {
            console.error("[Musicify] Node stats select error:", err.message);
        }
        return;
    }

    // ─── Status Back Button ───────────────────────────────────────
    if (interaction.isButton() && interaction.customId === "status_back") {
        await interaction.deferUpdate();

        const { buildStatusContainer } = require("../utils/statusPage");
        const container = buildStatusContainer(client);

        try {
            await interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (err) {
            console.error("[Musicify] Status back error:", err.message);
        }
        return;
    }

    // ─── Help Dropdown Navigation ─────────────────────────────────
    if (interaction.isStringSelectMenu() && interaction.customId === "help_select") {
        await interaction.deferUpdate();

        const selectedPage = interaction.values[0];
        const { buildHelpPage } = require("../commands/help");
        const container = await buildHelpPage(client, selectedPage);

        try {
            await interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (err) {
            console.error("[Musicify] Help select error:", err.message);
        }
        return;
    }

    // ─── Song Suggestion Select Menu ──────────────────────────────
    if (interaction.isStringSelectMenu() && interaction.customId === "song_suggestion") {
        if (!player) {
            return interaction.reply({ content: `❌ No music playing. Start with ${cmd("play")} or ChatPlay!`, flags: MessageFlags.Ephemeral });
        }
        if (!canControlMusic(interaction.member, player)) {
            return interaction.reply({ content: VOICE_CHANNEL_DENIAL, flags: MessageFlags.Ephemeral });
        }

        await interaction.deferUpdate();

        const selectedUri = interaction.values[0];
        const suggestion = guildData.suggestions.find(
            (s) => (s.info?.uri || s.info?.title) === selectedUri
        );

        if (suggestion) {
            suggestion.info.requester = interaction.user;
            player.queue.add(suggestion);
            if (!player.playing && !player.paused && !player.current) player.play();
        }

        return;
    }

    // ─── Buttons ──────────────────────────────────────────────────
    if (!interaction.isButton()) return;

    const customId = interaction.customId;

    // Queue button opens an ephemeral reply
    if (customId === "queue") {
        if (!player || !player.current) {
            return interaction.reply({ content: `❌ No music playing. Start with ${cmd("play")} or ChatPlay!`, flags: MessageFlags.Ephemeral });
        }
        if (!canControlMusic(interaction.member, player)) {
            return interaction.reply({ content: VOICE_CHANNEL_DENIAL, flags: MessageFlags.Ephemeral });
        }
        if (!guildData.queuePages) guildData.queuePages = new Map();
        guildData.queuePages.set(interaction.user.id, 0);
        const queueContainer = createQueueContainer(player.queue, player.current, 0);
        return interaction.reply({
            components: [queueContainer],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
    }

    // Queue pagination buttons
    if (customId.startsWith("queue_") && customId !== "queue") {
        if (!player || !player.current) {
            return interaction.reply({ content: `❌ No music playing. Start with ${cmd("play")} or ChatPlay!`, flags: MessageFlags.Ephemeral });
        }
        if (!canControlMusic(interaction.member, player)) {
            return interaction.reply({ content: VOICE_CHANNEL_DENIAL, flags: MessageFlags.Ephemeral });
        }

        await interaction.deferUpdate();

        const totalTracks = player.queue.length;
        const pageSize = 10;
        const totalPages = Math.max(1, Math.ceil(totalTracks / pageSize));
        if (!guildData.queuePages) guildData.queuePages = new Map();
        let currentPage = guildData.queuePages.get(interaction.user.id) || 0;

        switch (customId) {
            case "queue_first": currentPage = 0; break;
            case "queue_prev": currentPage = Math.max(0, currentPage - 1); break;
            case "queue_next": currentPage = Math.min(totalPages - 1, currentPage + 1); break;
            case "queue_last": currentPage = totalPages - 1; break;
        }

        guildData.queuePages.set(interaction.user.id, currentPage);

        const queueContainer = createQueueContainer(player.queue, player.current, currentPage);

        try {
            await interaction.editReply({
                components: [queueContainer],
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (err) {
            console.error("[Musicify] Queue pagination error:", err.message);
        }
        return;
    }

    // Most buttons need an active player
    const needsPlayer = ["pause_resume", "skip", "previous", "stop", "shuffle", "loop", "autoplay", "vol_up", "vol_down"];
    if (needsPlayer.includes(customId) && !player) {
        return interaction.reply({ content: `❌ No music playing. Start with ${cmd("play")} or ChatPlay!`, flags: MessageFlags.Ephemeral });
    }

    if (needsPlayer.includes(customId) && !canControlMusic(interaction.member, player)) {
        return interaction.reply({ content: VOICE_CHANNEL_DENIAL, flags: MessageFlags.Ephemeral });
    }

    // Defer immediately to avoid 3s timeout
    await interaction.deferUpdate();

    let needsVisualUpdate = false;

    switch (customId) {
        case "pause_resume": {
            if (player.paused) {
                player.pause(false);
                guildData.manuallyPaused = false;
            } else {
                player.pause(true);
                guildData.manuallyPaused = true;
            }
            needsVisualUpdate = true;
            break;
        }

        case "skip": {
            player.stop();
            break;
        }

        case "previous": {
            if (guildData.previousTracks.length > 0) {
                const prevTrack = guildData.previousTracks.pop();
                if (player.current) {
                    player.queue.unshift(player.current);
                }
                player.queue.unshift(prevTrack);
                player.stop();
            }
            break;
        }

        case "stop": {
            // If ChatPlay and 5+ songs in queue, ask for confirmation first
            const queueLength = player.queue?.length || 0;
            const isChatPlay = guildData.chatPlayChannelId && guildData.chatPlayMessageId;
            if (isChatPlay && queueLength >= 5 && !guildData.stopConfirmPending) {
                guildData.stopConfirmPending = interaction.user.id;
                setTimeout(() => {
                    if (guildData.stopConfirmPending === interaction.user.id) {
                        guildData.stopConfirmPending = null;
                    }
                }, 15000);
                return interaction.followUp({
                    content: `⚠️ There are **${queueLength} songs** in the queue. Click stop again within 15 seconds to confirm.`,
                    flags: MessageFlags.Ephemeral,
                });
            }
            guildData.stopConfirmPending = null;

            // Set stopping flag to prevent queueEnd race condition
            guildData.isStopping = true;

            // Clean up UI
            await cleanupPlayerUI(client, guildData);

            // Reset player state (timers, suggestions, etc.)
            resetPlayerState(guildData);

            player.queue.clear();
            player.stop();

            if (guildData.twentyFourSeven) {
                guildData.isStopping = false;
                return;
            }

            player.destroy();
            guildData.isStopping = false;
            return;
        }

        case "shuffle": {
            if (player.queue.length > 0) {
                player.queue.shuffle();
                guildData.shuffle = true;
                // Reset shuffle visual after 3 seconds
                setTimeout(() => { guildData.shuffle = false; }, 3000);
            }
            needsVisualUpdate = true;
            break;
        }

        case "loop": {
            if (guildData.loop === "none") {
                guildData.loop = "track";
                player.setLoop("track");
            } else if (guildData.loop === "track") {
                guildData.loop = "queue";
                player.setLoop("queue");
            } else {
                guildData.loop = "none";
                player.setLoop("none");
            }
            needsVisualUpdate = true;
            break;
        }

        case "autoplay": {
            guildData.autoplay = !guildData.autoplay;
            needsVisualUpdate = true;
            break;
        }

        case "vol_down": {
            guildData.volume = Math.max(0, guildData.volume - 10);
            player.setVolume(guildData.volume);
            needsVisualUpdate = true;
            break;
        }

        case "vol_up": {
            guildData.volume = Math.min(100, guildData.volume + 10);
            player.setVolume(guildData.volume);
            needsVisualUpdate = true;
            break;
        }

        default:
            break;
    }

    // If the button needs a visual update, edit the message directly
    if (needsVisualUpdate) {
        await editPlayerMessageDirectly(client, player, guildData);
    }
}

/**
 * Edit the player message directly (not via interaction.update)
 * This avoids the 3-second interaction timeout
 */
async function editPlayerMessageDirectly(client, player, guildData) {
    try {
        if (!player || !player.current) return;

        const musicardBuffer = await generateMusicCard(player.current, player, guildData);
        // Use ChatPlay container if in ChatPlay channel for consistent formatting
        const container = guildData.chatPlayChannelId && guildData.chatPlayMessageId
            ? createChatPlayNowPlayingContainer(player.current, player, guildData, musicardBuffer)
            : createNowPlayingContainer(player.current, player, guildData, musicardBuffer);

        const files = [];
        if (musicardBuffer) {
            files.push(new AttachmentBuilder(musicardBuffer, { name: "musicard.png" }));
        }

        const channelId = guildData.chatPlayChannelId || guildData.playerChannelId || player.textChannel;
        const channel = client.channels.cache.get(channelId);
        if (!channel) {
            guildData.chatPlayMessageId = null;
            guildData.playerMessageId = null;
            guildData.playerChannelId = null;
            return;
        }

        const messageId = guildData.chatPlayMessageId || guildData.playerMessageId;
        if (!messageId) return;

        const msg = await channel.messages.fetch(messageId);
        await msg.edit({
            components: [container],
            files: files,
            flags: MessageFlags.IsComponentsV2,
        });
    } catch (error) {
        // Message was deleted — clear stale IDs so next action sends a fresh one
        guildData.chatPlayMessageId = null;
        guildData.playerMessageId = null;
        guildData.playerChannelId = null;
        guildData.updateInterval && clearInterval(guildData.updateInterval);
        guildData.updateInterval = null;
        console.error("[Musicify] Button edit error:", error.message);
    }
}


module.exports = { handleButtonInteraction };
