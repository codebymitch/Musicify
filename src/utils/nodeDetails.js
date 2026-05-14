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
            `-# ${statusText}\n` +
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
            `-# 🎶 ${stats.playingPlayers || 0}\n` +
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
            `-# 🖥️ ${stats.cpu.cores || "N/A"}\n` +
            "**System Load**\n" +
            `-# ⚙️ ${(stats.cpu.systemLoad * 100).toFixed(1)}%\n` +
            "**Lavalink Load**\n" +
            `-# 🔧 ${(stats.cpu.lavalinkLoad * 100).toFixed(1)}%`;
    } else {
        cpuContent += "-# *No CPU data available*";
    }

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(cpuContent));
}

module.exports = { addNodeDetails };
