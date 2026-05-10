const { SlashCommandBuilder, MessageFlags, AttachmentBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require("discord.js");
const { getGuildData } = require("../utils/playerStore");
const { createNowPlayingContainer, formatDuration } = require("../utils/components");
const { generateMusicCard } = require("../utils/musicard");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("nowplaying")
        .setDescription("Show the currently playing track"),

    async execute(interaction, client) {
        const player = client.riffy.players.get(interaction.guild.id);
        if (!player || !player.current) {
            const container = new ContainerBuilder().setAccentColor(0xfacc15);
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### 🎶 Now Playing\n\n" +
                    "**Status**\n" +
                    "-# Nothing is playing right now."
                )
            );
            return interaction.reply({
                components: [container],
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
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
