const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} = require("discord.js");
const { addNodeDetails } = require("../utils/nodeDetails");

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
                new TextDisplayBuilder().setContent(
                    "### 🔗 Lavalink Node Stats\n" +
                    "-# *No Lavalink nodes configured.*"
                )
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
                new TextDisplayBuilder().setContent(
                    "### 🔗 Lavalink Node Stats\n" +
                    `-# ${nodeList.length} nodes configured`
                )
            );

            // Dropdown at the top (like the Command Browser)
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

            container.addActionRowComponents(
                new ActionRowBuilder().addComponents(selectMenu)
            );

            // Show first node details by default
            addNodeDetails(container, nodeList[0], 0);

            return interaction.reply({
                components: [container],
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            });
        }

        // Single node — show directly
        const container = new ContainerBuilder().setAccentColor(0xfacc15);
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "### 🔗 Lavalink Node Stats\n" +
                "-# 1 node configured"
            )
        );
        addNodeDetails(container, nodeList[0], 0);

        return interaction.reply({
            components: [container],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
    },
};
