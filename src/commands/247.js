const { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder } = require("discord.js");
const { getGuildData } = require("../utils/playerStore");
const { setGuildSetting, getGuildSettings } = require("../utils/database");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("247")
        .setDescription("Toggle 24/7 mode — bot stays in VC even when queue is empty"),

    async execute(interaction, client) {
        if (!interaction.member.voice?.channel) {
            return interaction.reply({
                content: "❌ You need to be in a voice channel!",
                flags: MessageFlags.Ephemeral,
            });
        }

        const guildId = interaction.guild.id;
        const guildData = getGuildData(guildId);
        const dbSettings = getGuildSettings(guildId);

        const newState = !dbSettings.twentyFourSeven;
        guildData.twentyFourSeven = newState;
        setGuildSetting(guildId, "twentyFourSeven", newState);

        if (newState) {
            let player = client.riffy.players.get(guildId);
            if (!player) {
                player = client.riffy.createConnection({
                    guildId: guildId,
                    voiceChannel: interaction.member.voice.channel.id,
                    textChannel: interaction.channel.id,
                    deaf: true,
                });
            }
        }

        const emoji = newState ? "✅" : "⏹";
        const label = newState ? "Enabled" : "Disabled";
        const desc = newState
            ? "Active — I'll stay in the voice channel."
            : "Inactive — I'll leave when the queue is empty.";

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${emoji} 24/7 Mode ${label}\n\n` +
                "**Status**\n" +
                `-# ${desc}\n\n` +
                "**Persists**\n" +
                "-# This setting is saved across bot restarts."
            )
        );
        await interaction.reply({
            components: [container],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
    },
};
