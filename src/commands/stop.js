const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { deleteGuildData } = require("../utils/playerStore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Stop playback, clear queue, and disconnect"),

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

        player.queue.clear();
        player.stop();
        player.destroy();

        await interaction.reply({
            content: "⏹ Stopped and disconnected!",
            flags: MessageFlags.Ephemeral,
        });
    },
};
