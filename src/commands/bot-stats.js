const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    ButtonBuilder,
    ButtonStyle,
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
                new TextDisplayBuilder().setContent("### <:Musicify_Logo:1504329028356673536> Statistics")
            )
            .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(
                    client.user.displayAvatarURL({ size: 128 })
                )
            );

        container.addSectionComponents(header);

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        // --- Calculate stats ---
        const uptimeSeconds = process.uptime();
        const startTime = new Date(Date.now() - uptimeSeconds * 1000);
        const startTimestamp = Math.floor(startTime.getTime() / 1000);

        const mem = process.memoryUsage();
        const memUsed = (mem.heapUsed / 1024 / 1024).toFixed(1);
        const memTotal = (mem.heapTotal / 1024 / 1024).toFixed(1);
        const memRSS = (mem.rss / 1024 / 1024).toFixed(1);

        const totalGuilds = client.guilds.cache.size;
        const totalUsers = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
        const totalChannels = client.channels.cache.size;
        const activePlayers = client.riffy.players?.size || 0;
        const totalNodes = client.riffy.nodes?.length || client.riffy.nodes?.size || 0;

        // --- General section with Support button accessory ---
        const generalSection = new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "**Bot ID**\n" +
                    `-# \`${client.user.id}\`\n` +
                    "**Uptime**\n" +
                    `-# <t:${startTimestamp}:f> (<t:${startTimestamp}:R>)\n` +
                    `-# *Times shown in your local timezone*\n` +
                    "**Ping**\n" +
                    `-# ${client.ws.ping}ms\n` +
                    "**Runtime**\n" +
                    `-# [Node.js ${process.version}](https://nodejs.org/) · [discord.js v${require("discord.js").version}](https://discord.js.org/)`
                )
            )
            .setButtonAccessory(
                new ButtonBuilder()
                    .setLabel("Support")
                    .setURL("https://discord.gg/MRjEUhDCpZ")
                    .setStyle(ButtonStyle.Link)
            );

        container.addSectionComponents(generalSection);

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        // --- Server stats section with Vote button accessory ---
        const serverSection = new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "**Guilds**\n" +
                    `-# ${totalGuilds.toLocaleString()}\n` +
                    "**Users**\n" +
                    `-# ${totalUsers.toLocaleString()}\n` +
                    "**Channels**\n" +
                    `-# ${totalChannels.toLocaleString()}`
                )
            )
            .setButtonAccessory(
                new ButtonBuilder()
                    .setLabel("⭐ Vote")
                    .setURL("https://top.gg/bot/1502977716196999309/vote")
                    .setStyle(ButtonStyle.Link)
            );

        container.addSectionComponents(serverSection);

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        // --- Performance section with Suggest button accessory ---
        const perfSection = new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "**Active Players**\n" +
                    `-# ${activePlayers}\n` +
                    "**Lavalink Nodes**\n" +
                    `-# ${totalNodes}\n` +
                    "**Memory**\n" +
                    `-# Heap: ${memUsed} / ${memTotal} MB · RSS: ${memRSS} MB`
                )
            )
            .setButtonAccessory(
                new ButtonBuilder()
                    .setLabel("💡 Suggest")
                    .setURL("https://discord.com/channels/1503210009251545152/1503721044291092480")
                    .setStyle(ButtonStyle.Link)
            );

        container.addSectionComponents(perfSection);

        await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
