const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stats")
        .setDescription("Show Musicify's statistics"),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const container = new ContainerBuilder().setAccentColor(0xfacc15);


        // --- Uptime ---
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        // --- Memory ---
        const mem = process.memoryUsage();
        const memUsed = (mem.heapUsed / 1024 / 1024).toFixed(1);
        const memTotal = (mem.heapTotal / 1024 / 1024).toFixed(1);
        const memRSS = (mem.rss / 1024 / 1024).toFixed(1);

        // --- Stats ---
        const totalGuilds = client.guilds.cache.size;
        const totalUsers = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
        const totalChannels = client.channels.cache.size;
        const activePlayers = client.riffy.players?.size || 0;

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));

        // --- General ---
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**General**\n` +
                `-#  **ID:** ${client.user.id}\n` +
                `-#  **Uptime:** ${uptimeStr}\n` +
                `-#  **Ping:** ${client.ws.ping}ms\n` +
                `-#  **Node.js:** ${process.version}\n` +
                `-#  **discord.js:** v${require("discord.js").version}`
            )
        );

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));

        // --- Servers & Players ---
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Servers & Players**\n` +
                `-#  **Guilds:** ${totalGuilds.toLocaleString()}\n` +
                `-#  **Users:** ${totalUsers.toLocaleString()}\n` +
                `-#  **Channels:** ${totalChannels.toLocaleString()}\n` +
                `-#  **Active Players:** ${activePlayers}\n` +
                `-#  **Lavalink Nodes:** ${client.riffy.nodes?.length || client.riffy.nodes?.size || 0}`
            )
        );

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));

        // --- Memory ---
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Memory**\n` +
                `-#  **Heap Used:** ${memUsed} MB\n` +
                `-#  **Heap Total:** ${memTotal} MB\n` +
                `-#  **RSS:** ${memRSS} MB`
            )
        );

        await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
