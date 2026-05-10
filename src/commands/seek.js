const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { formatDuration } = require("../utils/components");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("seek")
        .setDescription("Seek to a specific position in the track")
        .addStringOption((opt) =>
            opt
                .setName("time")
                .setDescription("Time to seek to (e.g. 1:30 or 90)")
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const player = client.riffy.players.get(interaction.guild.id);
        if (!player || !player.current) {
            return interaction.reply({
                content: "❌ Nothing is playing right now.",
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!interaction.member.voice?.channel) {
            return interaction.reply({
                content: "❌ You need to be in a voice channel!",
                flags: MessageFlags.Ephemeral,
            });
        }

        const timeStr = interaction.options.getString("time");
        let ms = 0;

        // Parse time — supports "1:30", "90", "1:30:00"
        if (timeStr.includes(":")) {
            const parts = timeStr.split(":").map(Number);
            if (parts.length === 2) {
                ms = (parts[0] * 60 + parts[1]) * 1000;
            } else if (parts.length === 3) {
                ms = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
            }
        } else {
            ms = parseInt(timeStr, 10) * 1000;
        }

        if (isNaN(ms) || ms < 0) {
            return interaction.reply({
                content: "❌ Invalid time format. Use `1:30` or `90`.",
                flags: MessageFlags.Ephemeral,
            });
        }

        if (ms > player.current.info.length) {
            return interaction.reply({
                content: `❌ Can't seek past track duration (${formatDuration(player.current.info.length)}).`,
                flags: MessageFlags.Ephemeral,
            });
        }

        player.seek(ms);
        await interaction.reply({
            content: `⏩ Seeked to **${formatDuration(ms)}**`,
            flags: MessageFlags.Ephemeral,
        });
    },
};
