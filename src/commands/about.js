const {
    SlashCommandBuilder,
    MessageFlags,
    AttachmentBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const path = require("path");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("about")
        .setDescription("Learn more about Musicify"),

    async execute(interaction, client) {
        const bannerPath = path.join(
            __dirname,
            "..",
            "..",
            ".github",
            "assets",
            "M_Banner.png"
        );
        const bannerAttachment = new AttachmentBuilder(bannerPath, {
            name: "M_Banner.png",
        });

        // ─── Container 1: Banner + Description ───
        const container1 = new ContainerBuilder().setAccentColor(0xfacc15);

        container1.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL("attachment://M_Banner.png")
            )
        );

        container1.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "Musicify is a premium multi-guild Discord music bot built to deliver high-quality music streaming directly to your voice channels. Powered by discord.js, Riffy, and Musicard, it offers seamless playback with rich now-playing cards, 10+ audio filter presets, smart queue management, ChatPlay mode for instant song requests, and an intuitive button-based control interface — all brought to you by TouchPoint and a passionate team of developers dedicated to creating the best music experience on Discord."
            )
        );

        // ─── Container 2: Team + Buttons ───
        const container2 = new ContainerBuilder().setAccentColor(0xfacc15);

        container2.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "**Team**\n\n**codebymitch**\n**ramsquishna**"
            )
        );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel("Source")
                .setURL("https://github.com/codebymitch/Musicify")
                .setStyle(ButtonStyle.Link),
            new ButtonBuilder()
                .setLabel("Support")
                .setURL("https://discord.gg/musicify")
                .setStyle(ButtonStyle.Link)
        );

        container2.addActionRowComponents(row);

        await interaction.reply({
            components: [container1, container2],
            files: [bannerAttachment],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
    },
};