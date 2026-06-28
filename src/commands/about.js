const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("about")
        .setDescription("Learn more about Musicify"),

    async execute(interaction, client) {
        const container = new ContainerBuilder();

        const botAvatar = client.user.displayAvatarURL({ size: 256 });

        container.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        "# <:Musicify_Logo:1504329028356673536> About Musicify"
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(botAvatar)
                )
        );

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        // Package and dependencies section with ButtonAccessory
        container.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        "**Powered By**\n" +
                        "-# • [discord.js](https://discord.js.org/)\n" +
                        "-# • [Riffy](https://riffy.js.org/)\n" +
                        "-# • [Musicard](https://www.npmjs.com/package/musicard)"
                    )
                )
                .addButtonAccessory(
                    new ButtonBuilder()
                        .setLabel("Source Code")
                        .setURL("https://github.com/codebymitch/Musicify")
                        .setStyle(ButtonStyle.Link)
                )
        );

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel("Support Server")
                .setURL("https://discord.gg/MRjEUhDCpZ")
                .setStyle(ButtonStyle.Link),
            new ButtonBuilder()
                .setLabel("⭐ Vote")
                .setURL("https://top.gg/bot/1502977716196999309/vote")
                .setStyle(ButtonStyle.Link)
        );

        container.addActionRowComponents(row);

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};