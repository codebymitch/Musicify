const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const config = require("../../config");
const { formatIncidents } = require("./incidents");

function getNodeList(client) {
    const nodes = client.riffy?.nodeMap;
    if (!nodes) return [];

    if (Array.isArray(nodes)) return nodes;
    if (nodes instanceof Map) return [...nodes.values()];
    return Object.values(nodes || {});
}

function countConnectedNodes(nodeList) {
    let connected = 0;
    for (const configNode of config.nodes) {
        const node = nodeList.find((n) => n.name === configNode.name);
        if (node?.connected || node?.isConnected) connected++;
    }
    return connected;
}

function getSystemStatus(connectedNodes, totalNodes) {
    const lavalinkUp = connectedNodes > 0;
    const lavalinkFullyConnected = connectedNodes === totalNodes && totalNodes > 0;

    if (!lavalinkUp) {
        return { emoji: "🔴", text: "Lavalink unavailable — playback may not work" };
    }

    if (!lavalinkFullyConnected) {
        return { emoji: "🟡", text: "Some Lavalink nodes are offline" };
    }

    return { emoji: "🟢", text: "All systems operational" };
}

function getComponentStatus(connected) {
    return connected
        ? { emoji: "🟢", label: "Connected" }
        : { emoji: "🔴", label: "Disconnected" };
}

function buildStatusContainer(client, { interactive = true, showSupportButton = interactive } = {}) {
    const nodeList = getNodeList(client);
    const totalNodes = config.nodes.length;
    const connectedNodes = countConnectedNodes(nodeList);
    const { emoji: statusEmoji, text: statusText } = getSystemStatus(
        connectedNodes,
        totalNodes
    );

    const uptimeSeconds = process.uptime();
    const startTime = new Date(Date.now() - uptimeSeconds * 1000);
    const startTimestamp = Math.floor(startTime.getTime() / 1000);

    const container = new ContainerBuilder();

    // --- Status header ---
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## ${statusEmoji} ${statusText}`)
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // --- Incidents section with Support/Report button accessory ---
    const incidentsSection = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Recent Incidents**\n` + formatIncidents(4)
            )
        )
        .setButtonAccessory(
            showSupportButton
                ? new ButtonBuilder()
                      .setLabel("Support")
                      .setURL("https://discord.gg/MRjEUhDCpZ")
                      .setStyle(ButtonStyle.Link)
                : new ButtonBuilder()
                      .setLabel("🐛 Report")
                      .setURL("https://github.com/codebymitch/Musicify/issues")
                      .setStyle(ButtonStyle.Link)
        );

    container.addSectionComponents(incidentsSection);

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // --- Uptime section with Vote button accessory ---
    const uptimeSection = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Uptime**\n` +
                `-# 🕒 <t:${startTimestamp}:f> (<t:${startTimestamp}:R>)\n` +
                `-# *Times shown in your local timezone*`
            )
        )
        .setButtonAccessory(
            new ButtonBuilder()
                .setLabel("⭐ Vote")
                .setURL("https://top.gg/bot/1502977716196999309/vote")
                .setStyle(ButtonStyle.Link)
        );

    container.addSectionComponents(uptimeSection);

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // --- Lavalink Node Stats ---
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "### Lavalink Node Stats\n" +
            `-# ${connectedNodes}/${totalNodes} nodes available`
        )
    );

    if (interactive) {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("node_stats_select")
            .setPlaceholder("📡 Select a node")
            .setMinValues(1)
            .setMaxValues(1);

        for (let i = 0; i < config.nodes.length; i++) {
            const configNode = config.nodes[i];
            const connectedNode = nodeList.find((n) => n.name === configNode.name);
            const connected = connectedNode?.connected || connectedNode?.isConnected || false;
            const nodeStatusEmoji = connected ? "🟢" : "🔴";
            const displayName = i === 0 ? "Main Node" : `Node ${i}`;
            selectMenu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(displayName)
                    .setDescription(`${nodeStatusEmoji} ${connected ? "Connected" : "Disconnected"}`)
                    .setValue(`node_${i}`)
            );
        }

        container.addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu));
    } else {
        const nodeLines = config.nodes.map((configNode, i) => {
            const connectedNode = nodeList.find((n) => n.name === configNode.name);
            const connected = connectedNode?.connected || connectedNode?.isConnected || false;
            const displayName = i === 0 ? "Main Node" : `Node ${i}`;
            const nodeStatus = getComponentStatus(connected);
            return `-# ${nodeStatus.emoji} **${displayName}** — ${nodeStatus.label}`;
        });

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent("**Node Health**\n" + nodeLines.join("\n"))
        );

        const updatedAt = Math.floor(Date.now() / 1000);
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Last updated <t:${updatedAt}:R>`)
        );
    }

    return container;
}

module.exports = {
    buildStatusContainer,
    countConnectedNodes,
    getSystemStatus,
    getNodeList,
};
