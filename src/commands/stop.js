const { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder } = require("discord.js");
const { getGuildData, resetPlayerState } = require("../utils/playerStore");
const { canControlMusic, VOICE_CHANNEL_DENIAL } = require("../utils/permissions");
const { cleanupPlayerUI } = require("../utils/cleanup");

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

        if (!canControlMusic(interaction.member, player)) {
            return interaction.reply({
                content: VOICE_CHANNEL_DENIAL,
                flags: MessageFlags.Ephemeral,
            });
        }

        const guildData = getGuildData(interaction.guild.id);

        // Set stopping flag to prevent queueEnd race condition
        guildData.isStopping = true;

        // Clean up UI using shared utility
        await cleanupPlayerUI(client, guildData);

        // Reset player state (timers, suggestions, history, etc.)
        resetPlayerState(guildData);

        player.queue.clear();
        player.stop();

        if (guildData.twentyFourSeven) {
            guildData.isStopping = false;
            const container = new ContainerBuilder();
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### ⏹ Stopped\n\n" +
                    "**Status**\n" +
                    "-# Queue cleared. Staying in voice channel (24/7 mode)."
                )
            );
            return interaction.reply({
                components: [container],
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            });
        }

        player.destroy();
        guildData.isStopping = false;

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "### ⏹ Stopped\n\n" +
                "**Status**\n" +
                "-# Queue cleared and disconnected from voice channel."
            )
        );
        await interaction.reply({
            components: [container],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
    },
};
