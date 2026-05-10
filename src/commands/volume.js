const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getGuildData } = require("../utils/playerStore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("volume")
        .setDescription("Set the playback volume")
        .addIntegerOption((opt) =>
            opt
                .setName("level")
                .setDescription("Volume level (0-150)")
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

        await interaction.reply({
            content: `🔊 Volume set to **${level}%**`,
            flags: MessageFlags.Ephemeral,
        });
    },
};
