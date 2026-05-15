const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} = require("discord.js");
const { ButtonStyle } = require("discord.js");

/**
 * Format milliseconds to mm:ss
 */
function formatDuration(ms) {
    if (!ms || isNaN(ms)) return "0:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Create the "Now Playing" container using Components V2
 * Design matches the example screenshot with -# subtext
 */
function createNowPlayingContainer(track, player, guildData, musicardBuffer) {
    const container = new ContainerBuilder();

    // --- Now Playing header + track info with thumbnail ---
    const section = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Now Playing — ${track.info.title || "Unknown"}**\n` +
                `-# By ${track.info.author || "Unknown Artist"}`
            ),
            new TextDisplayBuilder().setContent(
                `-# Requested by <@${track.info.requester?.id || track.info.requester}>`
            )
        )
        .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(
                track.info.artworkUrl || track.info.thumbnail || "https://i.imgur.com/4YFmJMi.png"
            )
        );

    container.addSectionComponents(section);

    // --- Separator ---
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // --- Status: Autoplay / Loop / Volume ---
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `Autoplay: ${guildData.autoplay ? "On" : "Off"}\n` +
            `Loop: ${capitalize(guildData.loop)}\n` +
            `Volume: ${guildData.volume}%`
        )
    );

    // --- Separator ---
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // --- Next on Deck ---
    const queue = player.queue;
    let nextContent = "**Next on Deck**\n";
    if (queue && queue.length > 0) {
        const upcoming = queue.slice(0, 3);
        for (let i = 0; i < upcoming.length; i++) {
            const t = upcoming[i];
            nextContent += `**${i + 1}.** ${(t.info.title || "Unknown").substring(0, 45)} - ${(t.info.author || "Unknown Artist").substring(0, 30)} · ${formatDuration(t.info.length)}\n`;
        }
        if (queue.length > 3) {
            nextContent += `-# *...and ${queue.length - 3} more in queue*`;
        }
    } else {
        nextContent += "-# *No upcoming tracks*";
    }
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(nextContent.trim())
    );

    // --- Musicard image ---
    if (musicardBuffer) {
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL("attachment://musicard.png")
            )
        );
    }

    // --- Song suggestions dropdown ---
    if (guildData.suggestions && guildData.suggestions.length > 0) {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("song_suggestion")
            .setPlaceholder("🎶 Pick a similar song")
            .setMinValues(1)
            .setMaxValues(1);

        const suggestions = guildData.suggestions.slice(0, 10);
        for (const suggestion of suggestions) {
            selectMenu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel((suggestion.info?.title || "Unknown").substring(0, 100))
                    .setDescription((suggestion.info?.author || "Unknown Artist").substring(0, 100))
                    .setValue(suggestion.info?.uri || suggestion.info?.title || "unknown")
            );
        }

        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(selectMenu)
        );
    }

    // --- Row 1: Shuffle | Previous | Pause/Play | Next | Loop ---
    const isPaused = player.paused;
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("shuffle")
            .setEmoji("🔀")
            .setStyle(guildData.shuffle ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("previous")
            .setEmoji("⏮️")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("pause_resume")
            .setEmoji(isPaused ? "▶️" : "⏸️")
            .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("skip")
            .setEmoji("⏭️")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("loop")
            .setEmoji("🔁")
            .setStyle(guildData.loop !== "none" ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );

    // --- Row 2: Autoplay | Vol Down | Stop | Vol Up | Queue ---
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("autoplay")
            .setEmoji("📻")
            .setStyle(guildData.autoplay ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("vol_down")
            .setEmoji("🔉")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("stop")
            .setEmoji("⏹️")
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId("vol_up")
            .setEmoji("🔊")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("queue")
            .setEmoji("📜")
            .setStyle(ButtonStyle.Secondary)
    );

    container.addActionRowComponents(row1, row2);
    return container;
}



/**
 * Create a ChatPlay idle container (no image, disabled buttons)
 */
function createChatPlayIdleContainer() {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "## <:Musicify_Logo:1504329028356673536> Musicify ChatPlay\n" +
            "-# *Type a song name in this channel to play it!*\n" +
            "-# I'll search, play it in your voice channel, and keep this message updated."
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "-# **Status:** Waiting for a song request..."
        )
    );

    // Disabled control buttons
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("shuffle").setEmoji("🔀").setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId("previous").setEmoji("⏮️").setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId("pause_resume").setEmoji("⏸️").setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId("skip").setEmoji("⏭️").setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId("loop").setEmoji("🔁").setStyle(ButtonStyle.Secondary).setDisabled(true)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("autoplay").setEmoji("📻").setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId("vol_down").setEmoji("🔉").setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId("stop").setEmoji("⏹️").setStyle(ButtonStyle.Danger).setDisabled(true),
        new ButtonBuilder().setCustomId("vol_up").setEmoji("🔊").setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId("queue").setEmoji("📜").setStyle(ButtonStyle.Secondary).setDisabled(true)
    );

    container.addActionRowComponents(row1, row2);

    return container;
}

/**
 * Create a ChatPlay now-playing container (includes ChatPlay header + now playing info)
 */
function createChatPlayNowPlayingContainer(track, player, guildData, musicardBuffer) {
    const container = new ContainerBuilder();

    // --- ChatPlay Header (always visible) ---
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "## <:Musicify_Logo:1504329028356673536> Musicify ChatPlay\n" +
            "-# *Type a song name in this channel to play it!*\n" +
            "-# I'll search, play it in your voice channel, and keep this message updated."
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // --- Now Playing header + track info with thumbnail ---
    const section = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Now Playing — ${track.info.title || "Unknown"}**\n` +
                `-# By ${track.info.author || "Unknown Artist"}`
            ),
            new TextDisplayBuilder().setContent(
                `-# Requested by <@${track.info.requester?.id || track.info.requester}>`
            )
        )
        .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(
                track.info.artworkUrl || track.info.thumbnail || "https://i.imgur.com/4YFmJMi.png"
            )
        );

    container.addSectionComponents(section);

    // --- Separator ---
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // --- Status: Autoplay / Loop / Volume ---
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `Autoplay: ${guildData.autoplay ? "On" : "Off"}\n` +
            `Loop: ${capitalize(guildData.loop)}\n` +
            `Volume: ${guildData.volume}%`
        )
    );

    // --- Separator ---
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // --- Next on Deck ---
    const queue = player.queue;
    let nextContent = "**Next on Deck**\n";
    if (queue && queue.length > 0) {
        const upcoming = queue.slice(0, 3);
        for (let i = 0; i < upcoming.length; i++) {
            const t = upcoming[i];
            nextContent += `**${i + 1}.** ${(t.info.title || "Unknown").substring(0, 45)} - ${(t.info.author || "Unknown Artist").substring(0, 30)} · ${formatDuration(t.info.length)}\n`;
        }
        if (queue.length > 3) {
            nextContent += `-# *...and ${queue.length - 3} more in queue*`;
        }
    } else {
        nextContent += "-# *No upcoming tracks*";
    }
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(nextContent.trim())
    );

    // --- Musicard image ---
    if (musicardBuffer) {
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL("attachment://musicard.png")
            )
        );
    }

    // --- Song suggestions dropdown ---
    if (guildData.suggestions && guildData.suggestions.length > 0) {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("song_suggestion")
            .setPlaceholder("🎶 Pick a similar song")
            .setMinValues(1)
            .setMaxValues(1);

        const suggestions = guildData.suggestions.slice(0, 10);
        for (const suggestion of suggestions) {
            selectMenu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel((suggestion.info?.title || "Unknown").substring(0, 100))
                    .setDescription((suggestion.info?.author || "Unknown Artist").substring(0, 100))
                    .setValue(suggestion.info?.uri || suggestion.info?.title || "unknown")
            );
        }

        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(selectMenu)
        );
    }

    // --- Row 1: Shuffle | Previous | Pause/Play | Next | Loop ---
    const isPaused = player.paused;
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("shuffle")
            .setEmoji("🔀")
            .setStyle(guildData.shuffle ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("previous")
            .setEmoji("⏮️")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("pause_resume")
            .setEmoji(isPaused ? "▶️" : "⏸️")
            .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("skip")
            .setEmoji("⏭️")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("loop")
            .setEmoji("🔁")
            .setStyle(guildData.loop !== "none" ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );

    // --- Row 2: Autoplay | Vol Down | Stop | Vol Up | Queue ---
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("autoplay")
            .setEmoji("📻")
            .setStyle(guildData.autoplay ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("vol_down")
            .setEmoji("🔉")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("stop")
            .setEmoji("⏹️")
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId("vol_up")
            .setEmoji("🔊")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("queue")
            .setEmoji("📜")
            .setStyle(ButtonStyle.Secondary)
    );

    container.addActionRowComponents(row1, row2);
    return container;
}

/**
 * Create queue display container with pagination
 */
function createQueueContainer(queue, currentTrack, page = 0) {
    const container = new ContainerBuilder();
    const pageSize = 10;
    const totalTracks = queue ? queue.length : 0;
    const totalPages = Math.max(1, Math.ceil(totalTracks / pageSize));

    // Clamp page
    if (page < 0) page = 0;
    if (page >= totalPages) page = totalPages - 1;

    // --- Total duration ---
    let totalDuration = 0;
    if (currentTrack && currentTrack.info.length) totalDuration += currentTrack.info.length;
    if (queue && queue.length > 0) {
        for (const t of queue) {
            if (t.info.length) totalDuration += t.info.length;
        }
    }

    // --- Header ---
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `### 📜 Queue\n` +
            `-# ${totalTracks} track${totalTracks !== 1 ? "s" : ""} · ${formatDuration(totalDuration)} total`
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // --- Now Playing ---
    if (currentTrack) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "**🎶 Now Playing**\n\n" +
                `**${(currentTrack.info.title || "Unknown").substring(0, 50)}**\n` +
                `-# ${(currentTrack.info.author || "Unknown Artist").substring(0, 30)} · ${formatDuration(currentTrack.info.length)}`
            )
        );
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    }

    // --- Queue tracks (numbered like Command Browser) ---
    if (!queue || queue.length === 0) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "**Up Next**\n\n" +
                "-# *No upcoming tracks in queue*"
            )
        );
    } else {
        const start = page * pageSize;
        const end = Math.min(start + pageSize, queue.length);

        let queueText = "**Up Next**\n\n";
        for (let i = start; i < end; i++) {
            const t = queue[i];
            const duration = formatDuration(t.info.length);
            queueText += `**${i + 1}.** ${(t.info.title || "Unknown").substring(0, 45)}\n`;
            queueText += `-# ${(t.info.author || "?").substring(0, 25)} · \`${duration}\`\n\n`;
        }

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(queueText.trim())
        );
    }

    // --- Pagination ---
    if (totalPages > 1) {
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# Page ${page + 1} of ${totalPages} · ${totalTracks} tracks`
            )
        );

        const paginationRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`queue_first`)
                .setEmoji("⏮")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId(`queue_prev`)
                .setEmoji("◀️")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId(`queue_page_info`)
                .setLabel(`${page + 1}/${totalPages}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(`queue_next`)
                .setEmoji("▶️")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= totalPages - 1),
            new ButtonBuilder()
                .setCustomId(`queue_last`)
                .setEmoji("⏭")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= totalPages - 1)
        );

        container.addActionRowComponents(paginationRow);
    }

    return container;
}

function capitalize(str) {
    if (!str) return "None";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
    createNowPlayingContainer,
    createChatPlayIdleContainer,
    createChatPlayNowPlayingContainer,
    createQueueContainer,
    formatDuration,
};
