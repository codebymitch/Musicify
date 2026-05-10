const { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder } = require("discord.js");
const { getGuildData, clearUpdateInterval } = require("../utils/playerStore");

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

        // Clean up guild state
        const guildData = getGuildData(interaction.guild.id);
        clearUpdateInterval(guildData);
        if (guildData.idleTimeout) {
            clearTimeout(guildData.idleTimeout);
            guildData.idleTimeout = null;
        }
        guildData.playerMessageId = null;
        guildData.playerChannelId = null;
        guildData.suggestions = [];
        guildData.previousTracks = [];

        player.queue.clear();
        player.stop();
        player.destroy();

        const container = new ContainerBuilder().setAccentColor(0xfacc15);
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
