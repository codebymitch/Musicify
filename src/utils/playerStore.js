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
        this.defaultVoiceChannel = null; // Predefined VC from /onboard
        this.autoplay = false;
        this.loop = "none"; // "none" | "track" | "queue"
        this.volume = 75;
        this.shuffle = false;
        this.previousTracks = [];
        this.suggestions = [];
        this.twentyFourSeven = false;
        this.queuePages = new Map(); // per-user queue page state
        this.updateInterval = null; // 15s musicard auto-update timer
        this.idleTimeout = null; // 30s disconnect timeout
        this.voiceMonitorInterval = null; // voice channel monitoring interval
        this.manuallyPaused = false; // true when user explicitly paused (not auto-paused)
        this.isStopping = false; // prevents queueEnd race condition during explicit stop
        this.stopConfirmPending = null;
    }
}

function clearUpdateInterval(guildData) {
    if (guildData.updateInterval) {
        clearInterval(guildData.updateInterval);
        guildData.updateInterval = null;
    }
}

function clearVoiceMonitor(guildData) {
    if (guildData.voiceMonitorInterval) {
        clearInterval(guildData.voiceMonitorInterval);
        guildData.voiceMonitorInterval = null;
    }
}

/**
 * Reset all transient player state (timers, suggestions, history).
 * Does NOT clear chatplay/onboard config or 24/7 settings.
 */
function resetPlayerState(guildData) {
    clearUpdateInterval(guildData);
    clearVoiceMonitor(guildData);
    if (guildData.idleTimeout) {
        clearTimeout(guildData.idleTimeout);
        guildData.idleTimeout = null;
    }
    guildData.suggestions = [];
    guildData.previousTracks = [];
    guildData.queuePages = new Map();
    guildData.shuffle = false;
    guildData.manuallyPaused = false;
    guildData.isStopping = false;
    guildData.stopConfirmPending = null;
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

module.exports = {
    getGuildData,
    deleteGuildData,
    clearUpdateInterval,
    clearVoiceMonitor,
    resetPlayerState,
    GuildData,
};
