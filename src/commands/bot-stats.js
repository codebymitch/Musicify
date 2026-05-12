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

        const container = new ContainerBuilder();

        // --- Header with bot avatar ---
        const header = new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("### 📊 Bot Statistics"),
                new TextDisplayBuilder().setContent(`-# ${client.user.tag}`)
            )
            .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(
                    client.user.displayAvatarURL({ size: 128 })
                )
            );

        container.addSectionComponents(header);

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

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
        const totalNodes = client.riffy.nodes?.length || client.riffy.nodes?.size || 0;

        // --- General ---
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "**Bot ID**\n" +
                `-# ${client.user.id}\n\n` +
                "**Uptime**\n" +
                `-# ${uptimeStr}\n\n` +
                "**Ping**\n" +
                `-# ${client.ws.ping}ms\n\n` +
                "**Runtime**\n" +
                `-# Node.js ${process.version} · discord.js v${require("discord.js").version}`
            )
        );

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        // --- Servers & Players ---
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "**Guilds**\n" +
                `-# ${totalGuilds.toLocaleString()}\n\n` +
                "**Users**\n" +
                `-# ${totalUsers.toLocaleString()}\n\n` +
                "**Channels**\n" +
                `-# ${totalChannels.toLocaleString()}\n\n` +
                "**Active Players**\n" +
                `-# ${activePlayers}\n\n` +
                "**Lavalink Nodes**\n" +
                `-# ${totalNodes}`
            )
        );

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        // --- Memory ---
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "**Heap Used**\n" +
                `-# ${memUsed} MB\n\n` +
                "**Heap Total**\n" +
                `-# ${memTotal} MB\n\n` +
                "**RSS**\n" +
                `-# ${memRSS} MB`
            )
        );

        await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
