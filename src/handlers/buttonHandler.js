const { MessageFlags, AttachmentBuilder } = require("discord.js");
const { getGuildData } = require("../utils/playerStore");
const { createNowPlayingContainer, createIdleContainer, createQueueContainer } = require("../utils/components");
const { generateMusicCard } = require("../utils/musicard");

/**
 * Handle all button and select menu interactions from the player container
 */
async function handleButtonInteraction(client, interaction) {
    const guildId = interaction.guild.id;
    const player = client.riffy.players.get(guildId);
    const guildData = getGuildData(guildId);

    // Handle node stats dropdown
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

        // Rebuild the container with selected node's details
        const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js");

        const container = new ContainerBuilder().setAccentColor(0xfacc15);
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# 🔗 Lavalink Node Stats")
        );

        // Node details first
        addNodeDetailsInline(container, selectedNode, nodeIndex);

        // Dropdown at the bottom
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("node_stats_select")
            .setPlaceholder("📡 Select a node")
            .setMinValues(1)
            .setMaxValues(1);

        for (let i = 0; i < nodeList.length; i++) {
            const n = nodeList[i];
            const c = n.connected || n.isConnected || false;
            selectMenu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(`${n.name || `Node ${i + 1}`}`)
                    .setDescription(`${c ? "🟢 Connected" : "🔴 Disconnected"}`)
                    .setValue(`node_${i}`)
                    .setDefault(i === nodeIndex)
            );
        }

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
        container.addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu));

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

    // Handle help dropdown navigation
    if (interaction.isStringSelectMenu() && interaction.customId === "help_select") {
        await interaction.deferUpdate();

        const selectedPage = interaction.values[0];
        const { buildHelpPage } = require("../commands/help");
        const container = buildHelpPage(client, selectedPage);

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
        guildData.queuePage = 0;
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
        let currentPage = guildData.queuePage || 0;

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

        guildData.queuePage = currentPage;

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
            player.queue.clear();
            player.stop();
            player.destroy();
            break;
        }

        case "shuffle": {
            if (player.queue.length > 0) {
                player.queue.shuffle();
                guildData.shuffle = !guildData.shuffle;
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
            guildData.volume = Math.min(150, guildData.volume + 10);
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
        if (!channel) return;

        const messageId = guildData.chatPlayMessageId || guildData.playerMessageId;
        if (!messageId) return;

        const msg = await channel.messages.fetch(messageId);
        await msg.edit({
            components: [container],
            files: files,
            flags: MessageFlags.IsComponentsV2,
        });
    } catch (error) {
        console.error("[Musicify] Button edit error:", error.message);
    }
}

/**
 * Inline node details builder for the node stats dropdown
 */
function addNodeDetailsInline(container, node, index) {
    const { TextDisplayBuilder, SeparatorBuilder } = require("discord.js");
    const connected = node.connected || node.isConnected || false;
    const statusEmoji = connected ? "🟢" : "🔴";
    const statusText = connected ? "Connected" : "Disconnected";

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `### ${statusEmoji} ${node.name || `Node ${index + 1}`}\n` +
            `-# **Status:** ${statusText}\n` +
            `-# **Secure:** ${node.secure ? "Yes (SSL)" : "No"}\n` +
            `-# **Rest Version:** ${node.restVersion || "N/A"}`
        )
    );

    if (!connected || !node.stats) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent("-# *Node is offline — no stats available.*")
        );
        return;
    }

    const stats = node.stats;

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `**Players**\n` +
            `-# 🎶 **Active:** ${stats.playingPlayers || 0}\n` +
            `-# 📻 **Total:** ${stats.players || 0}`
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    let cpuInfo = `**CPU**\n`;
    if (stats.cpu) {
        cpuInfo += `-# 🖥️ **Cores:** ${stats.cpu.cores || "N/A"}\n`;
        cpuInfo += `-# ⚙️ **System Load:** ${(stats.cpu.systemLoad * 100).toFixed(1)}%\n`;
        cpuInfo += `-# 🔧 **Lavalink Load:** ${(stats.cpu.lavalinkLoad * 100).toFixed(1)}%`;
    } else {
        cpuInfo += `-# *No CPU data available*`;
    }
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(cpuInfo));

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    let memInfo = `**Memory**\n`;
    if (stats.memory) {
        const used = (stats.memory.used / 1024 / 1024).toFixed(1);
        const free = (stats.memory.free / 1024 / 1024).toFixed(1);
        const allocated = (stats.memory.allocated / 1024 / 1024).toFixed(1);
        const reservable = (stats.memory.reservable / 1024 / 1024).toFixed(1);
        memInfo += `-# 💾 **Used:** ${used} MB\n`;
        memInfo += `-# 🆓 **Free:** ${free} MB\n`;
        memInfo += `-# 📦 **Allocated:** ${allocated} MB\n`;
        memInfo += `-# 📊 **Reservable:** ${reservable} MB`;
    } else {
        memInfo += `-# *No memory data available*`;
    }
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(memInfo));

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    let extraInfo = `**System**\n`;
    if (stats.uptime) {
        const up = stats.uptime / 1000;
        const d = Math.floor(up / 86400);
        const h = Math.floor((up % 86400) / 3600);
        const m = Math.floor((up % 3600) / 60);
        const s = Math.floor(up % 60);
        extraInfo += `-# ⏱️ **Uptime:** ${d}d ${h}h ${m}m ${s}s\n`;
    }
    if (stats.frameStats) {
        extraInfo += `-# 📤 **Frames Sent:** ${stats.frameStats.sent || 0}\n`;
        extraInfo += `-# ❌ **Frames Nulled:** ${stats.frameStats.nulled || 0}\n`;
        extraInfo += `-# ⚠️ **Frames Deficit:** ${stats.frameStats.deficit || 0}`;
    } else {
        extraInfo += `-# 📤 **Frame Stats:** N/A`;
    }
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(extraInfo));
}

module.exports = { handleButtonInteraction };
