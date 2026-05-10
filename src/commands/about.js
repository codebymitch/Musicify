const {
    SlashCommandBuilder,
    MessageFlags,
    AttachmentBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
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

        // ─── Container 1: Banner + About ───
        const container1 = new ContainerBuilder().setAccentColor(0xfacc15);

        container1.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL("attachment://M_Banner.png")
            )
        );

        container1.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "### 🎧 About Musicify\n" +
                "-# Your premium music companion for Discord."
            )
        );

        container1.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        container1.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "**What is Musicify?**\n" +
                "-# A premium multi-guild Discord music bot built to deliver\n" +
                "-# high-quality music streaming directly to your voice channels.\n\n" +
                "**Powered By**\n" +
                "-# discord.js · Riffy · Musicard\n\n" +
                "**Features**\n" +
                "-# 🎶 Rich now-playing cards with progress bars\n" +
                "-# 🎛️ 10+ audio filter presets\n" +
                "-# 📜 Smart queue management with pagination\n" +
                "-# 💬 ChatPlay — instant song requests\n" +
                "-# 🎮 Interactive button-based controls"
            )
        );

        // ─── Container 2: Team + Links ───
        const container2 = new ContainerBuilder().setAccentColor(0xfacc15);

        container2.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "### 👥 Team\n" +
                "-# Built by TouchPoint and a passionate team of developers."
            )
        );

        container2.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        container2.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "**codebymitch**\n" +
                "-# Lead Developer\n\n" +
                "**ramsquishna**\n" +
                "-# Developer"
            )
        );

        container2.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

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