/**
 * Per-guild data store for Musicify
 * Stores: player message, chatplay state, loop/autoplay/volume settings
 */
class GuildData {
    constructor() {
        this.playerMessageId = null;
        this.playerChannelId = null;
        this.chatPlayChannelId = null;
        this.chatPlayMessageId = null;
        this.chatPlayEnabled = false;
        this.autoplay = false;
        this.loop = "none"; // "none" | "track" | "queue"
        this.volume = 75;
        this.shuffle = false;
        this.previousTracks = [];
        this.suggestions = [];
        this.twentyFourSeven = false;
        this.updateInterval = null; // 15s musicard auto-update timer
        this.idleTimeout = null; // 30s disconnect timeout
    }
}

function clearUpdateInterval(guildData) {
    if (guildData.updateInterval) {
        clearInterval(guildData.updateInterval);
        guildData.updateInterval = null;
    }
}

const guildStore = new Map();

function getGuildData(guildId) {
    if (!guildStore.has(guildId)) {
        guildStore.set(guildId, new GuildData());
    }
    return guildStore.get(guildId);
}

function deleteGuildData(guildId) {
    guildStore.delete(guildId);
}

module.exports = { getGuildData, deleteGuildData, clearUpdateInterval, GuildData };
