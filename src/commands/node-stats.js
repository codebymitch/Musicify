const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("node")
        .setDescription("Show Lavalink node statistics"),

    async execute(interaction, client) {
        const nodes = client.riffy.nodeMap;
        const nodeList = Array.isArray(nodes)
            ? nodes
            : nodes instanceof Map
                ? [...nodes.values()]
                : Object.values(nodes || {});

        if (!nodeList || nodeList.length === 0) {
            const container = new ContainerBuilder().setAccentColor(0xfacc15);
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent("#  Lavalink Node Stats\n-# *No Lavalink nodes configured.*")
            );
            return interaction.reply({
                components: [container],
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            });
        }

        // Build dropdown if multiple nodes
        if (nodeList.length > 1) {
            const container = new ContainerBuilder().setAccentColor(0xfacc15);
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent("#  Lavalink Node Stats")
            );

            // Show first node details by default
            addNodeDetails(container, nodeList[0], 0);

            // Dropdown at the bottom
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId("node_stats_select")
                .setPlaceholder("📡 Select a node")
                .setMinValues(1)
                .setMaxValues(1);

            for (let i = 0; i < nodeList.length; i++) {
                const node = nodeList[i];
                const connected = node.connected || node.isConnected || false;
                const statusEmoji = connected ? "🟢" : "🔴";
                selectMenu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`${node.name || `Node ${i + 1}`}`)
                        .setDescription(`${statusEmoji} ${connected ? "Connected" : "Disconnected"}`)
                        .setValue(`node_${i}`)
                );
            }

            container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
            container.addActionRowComponents(
                new ActionRowBuilder().addComponents(selectMenu)
            );

            return interaction.reply({
                components: [container],
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            });
        }

        // Single node — show directly
        const container = new ContainerBuilder().setAccentColor(0xfacc15);
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# 🔗 Lavalink Node Stats")
        );
        addNodeDetails(container, nodeList[0], 0);

        return interaction.reply({
            components: [container],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
    },
};

/**
 * Add detailed node info to a container (no host/password exposed)
 */
function addNodeDetails(container, node, index) {
    const connected = node.connected || node.isConnected || false;
    const statusEmoji = connected ? "🟢" : "🔴";
    const statusText = connected ? "Connected" : "Disconnected";

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Basic info
    let basicInfo =
        `### ${statusEmoji} ${node.name || `Node ${index + 1}`}\n` +
        `-# **Status:** ${statusText}\n` +
        `-# **Secure:** ${node.secure ? "Yes (SSL)" : "No"}\n` +
        `-# **Rest Version:** ${node.restVersion || "N/A"}`;

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(basicInfo));

    if (!connected || !node.stats) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent("-# *Node is offline — no stats available.*")
        );
        return;
    }

    const stats = node.stats;

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Players
    const playersInfo =
        `**Players**\n` +
        `-#  **Active:** ${stats.playingPlayers || 0}\n` +
        `-#  **Total:** ${stats.players || 0}`;

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(playersInfo));

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // CPU
    let cpuInfo = `**CPU**\n`;
    if (stats.cpu) {
        cpuInfo += `-#  **Cores:** ${stats.cpu.cores || "N/A"}\n`;
        cpuInfo += `-#  **System Load:** ${(stats.cpu.systemLoad * 100).toFixed(1)}%\n`;
        cpuInfo += `-#  **Lavalink Load:** ${(stats.cpu.lavalinkLoad * 100).toFixed(1)}%`;
    } else {
        cpuInfo += `-# *No CPU data available*`;
    }

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(cpuInfo));

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Memory
    let memInfo = `**Memory**\n`;
    if (stats.memory) {
        const used = (stats.memory.used / 1024 / 1024).toFixed(1);
        const free = (stats.memory.free / 1024 / 1024).toFixed(1);
        const allocated = (stats.memory.allocated / 1024 / 1024).toFixed(1);
        const reservable = (stats.memory.reservable / 1024 / 1024).toFixed(1);
        memInfo += `-#  **Used:** ${used} MB\n`;
        memInfo += `-#  **Free:** ${free} MB\n`;
        memInfo += `-#  **Allocated:** ${allocated} MB\n`;
        memInfo += `-#  **Reservable:** ${reservable} MB`;
    } else {
        memInfo += `-# *No memory data available*`;
    }

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(memInfo));

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Uptime + Frame Stats
    let extraInfo = `**System**\n`;
    if (stats.uptime) {
        const up = stats.uptime / 1000;
        const d = Math.floor(up / 86400);
        const h = Math.floor((up % 86400) / 3600);
        const m = Math.floor((up % 3600) / 60);
        const s = Math.floor(up % 60);
        extraInfo += `-#  **Uptime:** ${d}d ${h}h ${m}m ${s}s\n`;
    }

    if (stats.frameStats) {
        extraInfo += `-#  **Frames Sent:** ${stats.frameStats.sent || 0}\n`;
        extraInfo += `-#  **Frames Nulled:** ${stats.frameStats.nulled || 0}\n`;
        extraInfo += `-#  **Frames Deficit:** ${stats.frameStats.deficit || 0}`;
    } else {
        extraInfo += `-#  **Frame Stats:** N/A`;
    }

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(extraInfo));
}
