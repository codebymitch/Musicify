const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getGuildData } = require("../utils/playerStore");
const { createQueueContainer } = require("../utils/components");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("queue")
        .setDescription("Show the current queue")
        .addIntegerOption((opt) =>
            opt
                .setName("page")
                .setDescription("Page number")
                .setRequired(false)
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

        const page = (interaction.options.getInteger("page") || 1) - 1;
        const container = createQueueContainer(player.queue, player.current, page);

        await interaction.reply({
            components: [container],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
    },
};
