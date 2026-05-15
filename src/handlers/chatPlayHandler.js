const { MessageFlags, AttachmentBuilder } = require("discord.js");
const { getGuildData } = require("../utils/playerStore");
const { createChatPlayIdleContainer, createNowPlayingContainer } = require("../utils/components");
const { generateMusicCard } = require("../utils/musicard");

/**
 * Handle ChatPlay messages
 * - Deletes user's message
 * - Resolves the song
 * - Plays in user's VC
 * - Edits the persistent ChatPlay message (never sends a new one)
 */
async function handleChatPlayMessage(client, message) {
    const guildData = getGuildData(message.guild.id);

    // Only handle messages in the ChatPlay channel when enabled
    if (!guildData.chatPlayChannelId || message.channel.id !== guildData.chatPlayChannelId) {
        return false;
    }

    // Check if ChatPlay is enabled
    if (!guildData.chatPlayEnabled) return false;

    // Ignore bot messages
    if (message.author.bot) return false;

    const query = message.content.trim();
    if (!query) return false;

    if (/(?:youtube\.com|youtu\.be)/i.test(query)) {
        try {
            await message.delete();
            const warn = await message.channel.send({
                content: "❌ YouTube links are currently not supported.",
            });
            setTimeout(() => warn.delete().catch(() => {}), 5000);
        } catch (err) {}
        return true;
    }

    // Delete the user's message immediately
    try {
        await message.delete();
    } catch (err) {
        console.error("[Musicify ChatPlay] Failed to delete message:", err.message);
    }

    // Check if the user is in a voice channel
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
        try {
            const warn = await message.channel.send({
                content: "❌ You need to join a voice channel first!",
            });
            setTimeout(() => warn.delete().catch(() => {}), 5000);
        } catch (err) {
            // Can't send in channel — ignore
        }
        return true;
    }

    try {
        // Create or get the player
        let player = client.riffy.players.get(message.guild.id);
        if (!player) {
            player = client.riffy.createConnection({
                guildId: message.guild.id,
                voiceChannel: voiceChannel.id,
                textChannel: message.channel.id,
                deaf: true,
            });
        }

        // Set volume
        player.setVolume(guildData.volume);

        // Update ChatPlay message to show loading state (only for first song)
        if (!player.playing && !player.paused && !player.current) {
            try {
                const { createChatPlayLoadingContainer } = require("../utils/components");
                const loadingContainer = createChatPlayLoadingContainer();
                const channel = client.channels.cache.get(guildData.chatPlayChannelId);
                if (channel && guildData.chatPlayMessageId) {
                    const msg = await channel.messages.fetch(guildData.chatPlayMessageId);
                    await msg.edit({
                        components: [loadingContainer],
                        flags: MessageFlags.IsComponentsV2,
                    });
                }
            } catch (err) {
                // Ignore if message edit fails
            }
        }

        // Resolve the query
        const result = await client.riffy.resolve({
            query: query,
            requester: message.author,
        });

        const { loadType, tracks, playlistInfo } = result;



        // Handle all loadType variants (v3 + v4)
        if (
            loadType === "playlist" ||
            loadType === "PLAYLIST_LOADED"
        ) {
            const duplicates = [];
            const addedTracks = [];
            
            for (const track of tracks) {
                track.info.requester = message.author;
                
                // Check for duplicates
                const isDuplicate = player.queue.some(existingTrack => 
                    existingTrack.info.uri === track.info.uri
                ) || (player.current && player.current.info.uri === track.info.uri);
                
                if (isDuplicate) {
                    duplicates.push(track.info.title || "Unknown");
                } else {
                    player.queue.add(track);
                    addedTracks.push(track.info.title || "Unknown");
                }
            }
            
            // Send feedback for playlist
            try {
                let feedbackMsg = `✅ Added **${addedTracks.length} tracks** to queue!`;
                if (duplicates.length > 0) {
                    feedbackMsg += `\n⚠️ Skipped ${duplicates.length} duplicates: ${duplicates.slice(0, 3).join(", ")}${duplicates.length > 3 ? "..." : ""}`;
                }
                const feedback = await message.channel.send({ content: feedbackMsg });
                setTimeout(() => feedback.delete().catch(() => {}), 5000);
            } catch (err) {}
            if (!player.playing && !player.paused && !player.current) player.play();
        } else if (
            loadType === "search" ||
            loadType === "track" ||
            loadType === "SEARCH_RESULT" ||
            loadType === "TRACK_LOADED"
        ) {
            const track = tracks[0];
            if (!track) {

                return true;
            }
            
            // Check for duplicate
            const isDuplicate = player.queue.some(existingTrack => 
                existingTrack.info.uri === track.info.uri
            ) || (player.current && player.current.info.uri === track.info.uri);
            
            if (isDuplicate) {
                try {
                    const feedback = await message.channel.send({
                        content: `⚠️ **${track.info.title}** is already in the queue!`
                    });
                    setTimeout(() => feedback.delete().catch(() => {}), 3000);
                } catch (err) {}
                return true;
            }
            
            track.info.requester = message.author;
            player.queue.add(track);
            // Send feedback for single track
            try {
                const feedback = await message.channel.send({
                    content: `✅ Added **${track.info.title}** to queue!`
                });
                setTimeout(() => feedback.delete().catch(() => {}), 3000);
            } catch (err) {}
            if (!player.playing && !player.paused && !player.current) player.play();
        } else {

        }
    } catch (error) {
        console.error("[Musicify ChatPlay] Error:", error.message);
    }

    return true;
}

module.exports = { handleChatPlayMessage };
