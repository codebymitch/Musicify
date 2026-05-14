const { MessageFlags, AttachmentBuilder } = require("discord.js");
const { getGuildData } = require("../utils/playerStore");
const { createNowPlayingContainer, createQueueContainer, createChatPlayIdleContainer } = require("../utils/components");
const { generateMusicCard } = require("../utils/musicard");
const { addNodeDetails } = require("../utils/nodeDetails");

/**
 * Handle all button and select menu interactions from the player container
 */
async function handleButtonInteraction(client, interaction) {
    if (!client.riffy) {
        console.warn('[Musicify] Riffy client not initialized; button handler ignored.');
        return;
    }
    const guildId = interaction.guild.id;
    const player = client.riffy.players.get(guildId);
    const guildData = getGuildData(guildId);

    // Handle node stats dropdown - show dedicated node details view
    if (interaction.isStringSelectMenu() && interaction.customId === "node_stats_select") {
        await interaction.deferUpdate();

        const selectedValue = interaction.values[0]; // "node_0", "node_1", etc
        const nodeIndex = parseInt(selectedValue.replace("node_", ""), 10);

        const nodes = client.riffy.nodeMap;
        const nodeList = Array.isArray(nodes)
            ? nodes
            : nodes instanceof Map
              ? [...nodes.values()]
              : Object.values(nodes || {});

        const selectedNode = nodeList[nodeIndex];
        if (!selectedNode) return;

        const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

        const connected = selectedNode.connected || selectedNode.isConnected || false;
        const statusEmoji = connected ? "🟢" : "🔴";
        const statusText = connected ? "Connected" : "Disconnected";

        const container = new ContainerBuilder();

        // Node header
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `## ${statusEmoji} ${selectedNode.name || `Node ${nodeIndex + 1}`}\n` +
                `-# ${statusText}`
            )
        );

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        if (!connected || !selectedNode.stats) {
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# Rest Version: ${selectedNode.restVersion || "N/A"}\n\n` +
                    "-# *Node is offline — no stats available.*"
                )
            );
        } else {
            const stats = selectedNode.stats;
            const cpuCores = stats.cpu?.cores || "N/A";
            const sysLoad = stats.cpu ? `${(stats.cpu.systemLoad * 100).toFixed(1)}%` : "N/A";
            const llLoad = stats.cpu ? `${(stats.cpu.lavalinkLoad * 100).toFixed(1)}%` : "N/A";

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# Rest Version: ${selectedNode.restVersion || "N/A"}\n\n` +
                    `**Players**\n` +
                    `-# 🎶 Active: ${stats.playingPlayers || 0}  •  📻 Total: ${stats.players || 0}\n\n` +
                    `**CPU**\n` +
                    `-# 🖥️ Cores: ${cpuCores}  •  ⚙️ System: ${sysLoad}  •  🔧 Lavalink: ${llLoad}`
                )
            );
        }

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));

        // Back button
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

    // Handle status back button - return to main status view
    if (interaction.isButton() && interaction.customId === "status_back") {
        await interaction.deferUpdate();

        const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

        const nodes = client.riffy.nodeMap;
        const nodeList = Array.isArray(nodes)
            ? nodes
            : nodes instanceof Map
              ? [...nodes.values()]
              : Object.values(nodes || {});

        const connectedNodes = nodeList.filter(n => n.connected || n.isConnected).length;
        const totalNodes = nodeList.length;
        const botPing = client.ws?.ping ?? 0;
        const uptimeSeconds = process.uptime();
        const startTime = new Date(Date.now() - uptimeSeconds * 1000);

        let statusEmoji = "🟢";
        let statusText = "All systems operational";
        if (connectedNodes === 0 || botPing > 300) {
            statusEmoji = "�";
            statusText = "Major system issues detected";
        } else if (connectedNodes < totalNodes || botPing > 100) {
            statusEmoji = "🟡";
            statusText = "Some systems experiencing issues";
        }

        const dayLabels = ['-6', '-5', '-4', '-3', '-2', '-1', ' 0'].join(' ');

        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `## ${statusEmoji} ${statusText}\n\n` +
                `**7-day History**\n` +
                `-# ${dayLabels}\n` +
                `-# 🟢🟢🟢🟢🟢🟢🟢`
            )
        );

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));

        const supportButton = new ButtonBuilder()
            .setLabel("Known Outages")
            .setURL("https://discord.gg/musicify")
            .setStyle(ButtonStyle.Link);

        container.addActionRowComponents(new ActionRowBuilder().addComponents(supportButton));

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Uptime**\n` +
                `-# 🕒 <t:${Math.floor(startTime.getTime() / 1000)}:R>`
            )
        );

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "### Lavalink Node Stats\n" +
                `-# ${nodeList.length} node${nodeList.length === 1 ? "" : "s"} available`
            )
        );

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("node_stats_select")
            .setPlaceholder("📡 Select a node")
            .setMinValues(1)
            .setMaxValues(1);

        for (let i = 0; i < nodeList.length; i++) {
            const node = nodeList[i];
            const connected = node.connected || node.isConnected || false;
            const nodeStatusEmoji = connected ? "🟢" : "🔴";
            selectMenu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(`${node.name || `Node ${i + 1}`}`)
                    .setDescription(`${nodeStatusEmoji} ${connected ? "Connected" : "Disconnected"}`)
                    .setValue(`node_${i}`)
            );
        }

        container.addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu));

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

    // Handle help dropdown navigation
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

    // Handle song suggestion select menu
    if (interaction.isStringSelectMenu() && interaction.customId === "song_suggestion") {
        if (!player) {
            return interaction.reply({ content: "No active player.", flags: MessageFlags.Ephemeral });
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

    // Handle buttons
    if (!interaction.isButton()) return;

    const customId = interaction.customId;

    // Queue button opens an ephemeral reply
    if (customId === "queue") {
        if (!player || !player.current) {
            return interaction.reply({ content: "❌ No active player.", flags: MessageFlags.Ephemeral });
        }
        if (!guildData.queuePages) guildData.queuePages = new Map();
        guildData.queuePages.set(interaction.user.id, 0);
        const queueContainer = createQueueContainer(
            player.queue,
            player.current,
            0
        );
        return interaction.reply({
            components: [queueContainer],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
    }

    // Queue pagination buttons
    if (customId.startsWith("queue_") && customId !== "queue") {
        if (!player || !player.current) {
            return interaction.reply({ content: "❌ No active player.", flags: MessageFlags.Ephemeral });
        }

        await interaction.deferUpdate();

        const totalTracks = player.queue.length;
        const pageSize = 10;
        const totalPages = Math.max(1, Math.ceil(totalTracks / pageSize));
        if (!guildData.queuePages) guildData.queuePages = new Map();
        let currentPage = guildData.queuePages.get(interaction.user.id) || 0;

        switch (customId) {
            case "queue_first":
                currentPage = 0;
                break;
            case "queue_prev":
                currentPage = Math.max(0, currentPage - 1);
                break;
            case "queue_next":
                currentPage = Math.min(totalPages - 1, currentPage + 1);
                break;
            case "queue_last":
                currentPage = totalPages - 1;
                break;
        }

        guildData.queuePages.set(interaction.user.id, currentPage);

        const queueContainer = createQueueContainer(
            player.queue,
            player.current,
            currentPage
        );

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

    // Most buttons need an active player — send ephemeral if not
    const needsPlayer = ["pause_resume", "skip", "previous", "stop", "shuffle", "loop", "autoplay", "vol_up", "vol_down"];
    if (needsPlayer.includes(customId) && !player) {
        return interaction.reply({ content: "❌ No active player.", flags: MessageFlags.Ephemeral });
    }

    // Defer immediately to avoid 3s timeout
    await interaction.deferUpdate();

    let needsVisualUpdate = false;

    switch (customId) {
        case "pause_resume": {
            if (player.paused) {
                player.pause(false);
            } else {
                player.pause(true);
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
                // Clear confirmation after 15 seconds
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
            
            // If ChatPlay, edit message back to idle state BEFORE destroying player
            if (guildData.chatPlayChannelId && guildData.chatPlayMessageId) {
                try {
                    const container = createChatPlayIdleContainer();
                    const channel = client.channels.cache.get(guildData.chatPlayChannelId);
                    if (channel) {
                        const msg = await channel.messages.fetch(guildData.chatPlayMessageId);
                        await msg.edit({
                            components: [container],
                            attachments: [],
                            flags: MessageFlags.IsComponentsV2,
                        });
                    }
                } catch (err) {
                    console.error("[Musicify] Failed to edit ChatPlay message on stop:", err.message);
                }
            }
            
            player.queue.clear();
            player.stop();
            player.destroy();
            return; // Don't try to update player message since player is destroyed
        }

        case "shuffle": {
            if (player.queue.length > 0) {
                player.queue.shuffle();
                guildData.shuffle = true;
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
        const container = createNowPlayingContainer(player.current, player, guildData, musicardBuffer);

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
