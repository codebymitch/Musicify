const { SlashCommandBuilder, MessageFlags, AttachmentBuilder } = require("discord.js");
const { getGuildData } = require("../utils/playerStore");
const { createNowPlayingContainer } = require("../utils/components");
const { generateMusicCard } = require("../utils/musicard");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("nowplaying")
        .setDescription("Show the currently playing track"),

    async execute(interaction, client) {
        const player = client.riffy.players.get(interaction.guild.id);
        if (!player || !player.current) {
            return interaction.reply({
                content: "❌ Nothing is playing right now.",
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const guildData = getGuildData(interaction.guild.id);
        const musicardBuffer = await generateMusicCard(player.current, player, guildData);
        const container = createNowPlayingContainer(player.current, player, guildData, musicardBuffer);

        const files = [];
        if (musicardBuffer) {
            files.push(new AttachmentBuilder(musicardBuffer, { name: "musicard.png" }));
        }

        await interaction.editReply({
            components: [container],
            files: files,
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
