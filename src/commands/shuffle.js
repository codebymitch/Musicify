const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("shuffle")
        .setDescription("Shuffle the queue"),

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

        if (player.queue.length === 0) {
            return interaction.reply({
                content: "❌ Queue is empty, nothing to shuffle.",
                flags: MessageFlags.Ephemeral,
            });
        }

        player.queue.shuffle();
        await interaction.reply({
            content: `🔀 Shuffled **${player.queue.length}** tracks!`,
            flags: MessageFlags.Ephemeral,
        });
    },
};
