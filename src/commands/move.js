const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("move")
        .setDescription("Move a track to a different position in the queue")
        .addIntegerOption((opt) =>
            opt
                .setName("from")
                .setDescription("Current position of the track (1-based)")
                .setRequired(true)
                .setMinValue(1)
        )
        .addIntegerOption((opt) =>
            opt
                .setName("to")
                .setDescription("New position for the track (1-based)")
                .setRequired(true)
                .setMinValue(1)
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

        const from = interaction.options.getInteger("from");
        const to = interaction.options.getInteger("to");
        const queueLen = player.queue.length;

        if (from > queueLen || to > queueLen) {
            return interaction.reply({
                content: `❌ Invalid position. Queue has **${queueLen}** track(s).`,
                flags: MessageFlags.Ephemeral,
            });
        }

        if (from === to) {
            return interaction.reply({
                content: "❌ From and to positions are the same.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const [track] = player.queue.splice(from - 1, 1);
        player.queue.splice(to - 1, 0, track);

        await interaction.reply({
            content: `↕️ Moved **${track.info.title}** from position **${from}** → **${to}**`,
            flags: MessageFlags.Ephemeral,
        });
    },
};
