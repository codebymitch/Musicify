const { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("remove")
        .setDescription("Remove a track from the queue")
        .addIntegerOption((opt) =>
            opt
                .setName("position")
                .setDescription("Position of the track to remove (1-based)")
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

        const pos = interaction.options.getInteger("position");
        if (pos > player.queue.length) {
            return interaction.reply({
                content: `❌ Invalid position. Queue has **${player.queue.length}** track(s).`,
                flags: MessageFlags.Ephemeral,
            });
        }

        const removed = player.queue.splice(pos - 1, 1);
        const trackName = removed[0]?.info?.title || "Unknown";

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "### 🗑️ Track Removed\n\n" +
                "**Track**\n" +
                `-# ${trackName}\n\n` +
                "**Was at**\n" +
                `-# Position #${pos}\n\n` +
                "**Queue**\n" +
                `-# ${player.queue.length} track(s) remaining`
            )
        );
        await interaction.reply({
            components: [container],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
    },
};
