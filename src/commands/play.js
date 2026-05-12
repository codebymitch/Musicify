const { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require("discord.js");
const { getGuildData } = require("../utils/playerStore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play a song or add it to the queue")
        .addStringOption((opt) =>
            opt.setName("query").setDescription("Song name or URL").setRequired(true)
        ),

    async execute(interaction, client) {
        const query = interaction.options.getString("query");
        const member = interaction.member;

        if (!member.voice?.channel) {
            return interaction.reply({
                content: "❌ You need to be in a voice channel!",
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const guildData = getGuildData(interaction.guild.id);

        // Create or get player
        let player = client.riffy.players.get(interaction.guild.id);
        if (!player) {
            player = client.riffy.createConnection({
                guildId: interaction.guild.id,
                voiceChannel: member.voice.channel.id,
                textChannel: interaction.channel.id,
                deaf: true,
            });
            guildData.playerChannelId = interaction.channel.id;
        }

        // Set volume
        player.setVolume(guildData.volume);

        try {
            const result = await client.riffy.resolve({
                query: query,
                requester: interaction.user,
            });

            const { loadType, tracks, playlistInfo } = result;

            // Handle all Lavalink v3 + v4 loadType variants
            if (
                loadType === "playlist" ||
                loadType === "PLAYLIST_LOADED"
            ) {
                for (const track of tracks) {
                    track.info.requester = interaction.user;
                    player.queue.add(track);
                }

                const container = new ContainerBuilder();
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        "### ✅ Playlist Added\n\n" +
                        "**Playlist**\n" +
                        `-# ${playlistInfo.name}\n\n` +
                        "**Tracks**\n" +
                        `-# ${tracks.length} songs added to queue`
                    )
                );
                await interaction.editReply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                });

                if (!player.playing && !player.paused && !player.current) player.play();
            } else if (
                loadType === "search" ||
                loadType === "track" ||
                loadType === "SEARCH_RESULT" ||
                loadType === "TRACK_LOADED"
            ) {
                const track = tracks[0];
                if (!track) {
                    return interaction.editReply({ content: "❌ No results found." });
                }
                track.info.requester = interaction.user;
                player.queue.add(track);

                const container = new ContainerBuilder();
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        "### ✅ Track Added\n\n" +
                        "**Title**\n" +
                        `-# ${track.info.title}\n\n` +
                        "**Artist**\n" +
                        `-# ${track.info.author}\n\n` +
                        "**Position**\n" +
                        `-# #${player.queue.length} in queue`
                    )
                );
                await interaction.editReply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                });

                if (!player.playing && !player.paused && !player.current) player.play();
            } else {
                console.log(`[Musicify] Unhandled loadType: "${loadType}"`);
                return interaction.editReply({ content: `❌ No results found. (loadType: ${loadType})` });
            }
        } catch (error) {
            console.error("[Musicify] Play error:", error);
            return interaction.editReply({ content: "❌ An error occurred while searching." });
        }
    },
};
