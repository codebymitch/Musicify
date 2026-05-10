const { TextDisplayBuilder, SeparatorBuilder } = require("discord.js");

/**
 * Add detailed node info to a container (no host/password exposed)
 * Shared between node-stats command and button handler dropdown
 *
 * Uses the bold-label + subtext design pattern.
 */
function addNodeDetails(container, node, index) {
    const connected = node.connected || node.isConnected || false;
    const statusEmoji = connected ? "🟢" : "🔴";
    const statusText = connected ? "Connected" : "Disconnected";

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Node identity + connection info
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `### ${statusEmoji} ${node.name || `Node ${index + 1}`}\n\n` +
            "**Status**\n" +
            `-# ${statusText}\n\n` +
            "**Secure**\n" +
            `-# ${node.secure ? "Yes (SSL)" : "No"}\n\n` +
            "**Rest Version**\n" +
            `-# ${node.restVersion || "N/A"}`
        )
    );

    if (!connected || !node.stats) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent("-# *Node is offline — no stats available.*")
        );
        return;
    }

    const stats = node.stats;

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Players
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**Players**\n\n" +
            "**Active**\n" +
            `-# 🎶 ${stats.playingPlayers || 0}\n\n` +
            "**Total**\n" +
            `-# 📻 ${stats.players || 0}`
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // CPU
    let cpuContent = "**CPU**\n\n";
    if (stats.cpu) {
        cpuContent +=
            "**Cores**\n" +
            `-# 🖥️ ${stats.cpu.cores || "N/A"}\n\n` +
            "**System Load**\n" +
            `-# ⚙️ ${(stats.cpu.systemLoad * 100).toFixed(1)}%\n\n` +
            "**Lavalink Load**\n" +
            `-# 🔧 ${(stats.cpu.lavalinkLoad * 100).toFixed(1)}%`;
    } else {
        cpuContent += "-# *No CPU data available*";
    }

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(cpuContent));

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Memory
    let memContent = "**Memory**\n\n";
    if (stats.memory) {
        const used = (stats.memory.used / 1024 / 1024).toFixed(1);
        const free = (stats.memory.free / 1024 / 1024).toFixed(1);
        const allocated = (stats.memory.allocated / 1024 / 1024).toFixed(1);
        const reservable = (stats.memory.reservable / 1024 / 1024).toFixed(1);
        memContent +=
            "**Used**\n" +
            `-# 💾 ${used} MB\n\n` +
            "**Free**\n" +
            `-# 🆓 ${free} MB\n\n` +
            "**Allocated**\n" +
            `-# 📦 ${allocated} MB\n\n` +
            "**Reservable**\n" +
            `-# 📊 ${reservable} MB`;
    } else {
        memContent += "-# *No memory data available*";
    }

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(memContent));

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // System — Uptime + Frame Stats
    let sysContent = "**System**\n\n";
    if (stats.uptime) {
        const up = stats.uptime / 1000;
        const d = Math.floor(up / 86400);
        const h = Math.floor((up % 86400) / 3600);
        const m = Math.floor((up % 3600) / 60);
        const s = Math.floor(up % 60);
        sysContent +=
            "**Uptime**\n" +
            `-# ⏱️ ${d}d ${h}h ${m}m ${s}s\n\n`;
    }

    if (stats.frameStats) {
        sysContent +=
            "**Frames Sent**\n" +
            `-# 📤 ${stats.frameStats.sent || 0}\n\n` +
            "**Frames Nulled**\n" +
            `-# ❌ ${stats.frameStats.nulled || 0}\n\n` +
            "**Frames Deficit**\n" +
            `-# ⚠️ ${stats.frameStats.deficit || 0}`;
    } else {
        sysContent += "**Frame Stats**\n-# 📤 N/A";
    }

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(sysContent));
}

module.exports = { addNodeDetails };
