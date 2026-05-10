const { initializeFonts, Bloom } = require("musicard");
const config = require("../../config");

let fontsInitialized = false;

/**
 * Generate a musicard image buffer for a track
 */
async function generateMusicCard(track, player, guildData) {
    try {
        if (!fontsInitialized) {
            await initializeFonts();
            fontsInitialized = true;
        }

        const duration = track.info.length || 0;
        const position = player.position || 0;
        const progress = duration > 0 ? Math.floor((position / duration) * 100) : 0;

        const musicardConfig = config.musicard || {};

        const card = await Bloom({
            trackName: (track.info.title || "Unknown").substring(0, 40),
            artistName: (track.info.author || "Unknown Artist").substring(0, 30),
            albumArt: track.info.artworkUrl || track.info.thumbnail || "https://i.imgur.com/4YFmJMi.png",
            timeAdjust: {
                timeStart: formatTime(position),
                timeEnd: formatTime(duration),
            },
            progressBar: Math.min(Math.max(progress, 0), 100),
            volumeBar: guildData.volume || 75,
            progressBarColor: musicardConfig.progressBarColor || "#FACC15",
            backgroundColor: musicardConfig.backgroundColor || "#2b2d31",
        });

        return card;
    } catch (error) {
        console.error("[Musicard] Failed to generate card:", error);
        return null;
    }
}

function formatTime(ms) {
    if (!ms || isNaN(ms)) return "0:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

module.exports = { generateMusicCard };
