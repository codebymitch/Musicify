const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
module.exports = {
    data: new SlashCommandBuilder()
        .setName("status")
        .setDescription("Check the current status of Musicify's systems"),

    async execute(interaction, client) {
        // Calculate system health
        const nodes = client.riffy.nodeMap;
        const nodeList = Array.isArray(nodes)
            ? nodes
            : nodes instanceof Map
                ? [...nodes.values()]
                : Object.values(nodes || {});

        const connectedNodes = nodeList.filter(node => node.connected || node.isConnected).length;
        const totalNodes = nodeList.length;
        const botPing = client.ws?.ping ?? 0;

        let statusEmoji = "🟢";
        let statusText = "All systems operational";

        if (connectedNodes === 0 || botPing > 300) {
            statusEmoji = "🔴";
            statusText = "Major system issues detected";
        } else if (connectedNodes < totalNodes || botPing > 100) {
            statusEmoji = "🟡";
            statusText = "Some systems experiencing issues";
        }

        // Calculate uptime
        const uptimeSeconds = process.uptime();
        const uptimeHours = Math.floor(uptimeSeconds / 3600);
        const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
        const startTime = new Date(Date.now() - uptimeSeconds * 1000);

        // Calculate 7-day history labels (relative days ago)
        const dayLabels = ['-6', '-5', '-4', '-3', '-2', '-1', ' 0'].join(' ');

        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `## ${statusEmoji} ${statusText}`
            )
        );

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
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

        if (!nodeList || nodeList.length === 0) {
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### Lavalink Node Stats\n" +
                    "-# *No Lavalink nodes configured.*"
                )
            );

            return interaction.reply({
                components: [container],
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            });
        }

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

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        container.addActionRowComponents(selectRow);

        return interaction.reply({
            components: [container],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
    },
};

