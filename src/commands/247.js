const { SlashCommandBuilder, MessageFlags } = require("discord.js");
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

        // Toggle
        const newState = !dbSettings.twentyFourSeven;
        guildData.twentyFourSeven = newState;
        setGuildSetting(guildId, "twentyFourSeven", newState);

        // If enabling, ensure player exists
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

        await interaction.reply({
            content: newState
                ? "✅ 24/7 mode **enabled** — I'll stay in the voice channel."
                : "⏹ 24/7 mode **disabled** — I'll leave when the queue is empty.",
            flags: MessageFlags.Ephemeral,
        });
    },
};
