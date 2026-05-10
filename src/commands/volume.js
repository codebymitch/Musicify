const { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder } = require("discord.js");
const { getGuildData } = require("../utils/playerStore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("volume")
        .setDescription("Set the playback volume")
        .addIntegerOption((opt) =>
            opt
                .setName("level")
                .setDescription("Volume level (0-100)")
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(100)
        ),

    async execute(interaction, client) {
        const player = client.riffy.players.get(interaction.guild.id);
        if (!player) {
            return interaction.reply({
                content: "❌ No active player.",
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!interaction.member.voice?.channel) {
            return interaction.reply({
                content: "❌ You need to be in a voice channel!",
                flags: MessageFlags.Ephemeral,
            });
        }

        const level = Math.min(100, Math.max(0, interaction.options.getInteger("level")));

        const guildData = getGuildData(interaction.guild.id);
        guildData.volume = level;
        player.setVolume(level);

        // Build a simple volume bar
        const filled = Math.round(level / 10);
        const bar = "█".repeat(filled) + "░".repeat(10 - filled);

        const container = new ContainerBuilder().setAccentColor(0xfacc15);
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "### 🔊 Volume Updated\n\n" +
                "**Level**\n" +
                `-# ${level}%\n\n` +
                "**Volume**\n" +
                `-# ${bar}`
            )
        );
        await interaction.reply({
            components: [container],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
    },
};
