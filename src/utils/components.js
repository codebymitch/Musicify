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
    const container = new ContainerBuilder().setAccentColor(0xfacc15);

    // --- Now Playing header + track info with thumbnail ---
    const section = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Now Playing**\n` +
                `### ${track.info.title || "Unknown"}\n` +
                `-# ${track.info.author || "Unknown Artist"}`
            ),
            new TextDisplayBuilder().setContent(
                `-# ⏱ ${formatDuration(track.info.length)}\n` +
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

    // --- Status: Autoplay / Loop / Volume (subtext) ---
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `-# Autoplay: ${guildData.autoplay ? "On" : "Off"}\n` +
            `-# Loop: ${capitalize(guildData.loop)}\n` +
            `-# Volume: ${guildData.volume}%`
        )
    );

    // --- Separator ---
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // --- Next on Deck ---
    const queue = player.queue;
    let nextText = "-# *No upcoming tracks*";
    if (queue && queue.length > 0) {
        const upcoming = queue.slice(0, 3);
        nextText = upcoming
            .map((t, i) => `-# **${i + 1}.** ${t.info.title} — ${t.info.author}`)
            .join("\n");
        if (queue.length > 3) {
            nextText += `\n-# *...and ${queue.length - 3} more*`;
        }
    }
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Next on Deck**\n${nextText}`)
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
            .setEmoji("<:shuffle:1481532332543574137>")
            .setStyle(guildData.shuffle ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("previous")
            .setEmoji("<:angledoubleleft:1481532339459854386>")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("pause_resume")
            .setEmoji(isPaused ? "<:play:1481532344920834130>" : "<:pause:1481532336679030815>")
            .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("skip")
            .setEmoji("<:angledoubleright:1481532342542663841>")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("loop")
            .setEmoji("<:loopsquare:1481532334808371311>")
            .setStyle(guildData.loop !== "none" ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );

    // --- Row 2: Autoplay | Vol Down | Stop | Vol Up | Queue ---
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("autoplay")
            .setEmoji("<:streaming:1481532239035633756>")
            .setStyle(guildData.autoplay ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("vol_down")
            .setEmoji("<:volumedown:1481532227467608138>")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("stop")
            .setEmoji("<:stop:1481571774234628096>")
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId("vol_up")
            .setEmoji("<:volume:1481532229623484487>")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("queue")
            .setEmoji("<:documentwriter:1481532241136844984>")
            .setStyle(ButtonStyle.Secondary)
    );

    container.addActionRowComponents(row1, row2);
    return container;
}

/**
 * Create the "Idle / Queue Ended" container
 */
function createIdleContainer() {
    const container = new ContainerBuilder().setAccentColor(0x2b2d31);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "### 🎶 Queue Ended\n-# *No more tracks left in the queue.*"
        )
    );

    // Idle image
    container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL("attachment://idle.png")
        )
    );

    // Minimal buttons
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("pause_resume").setEmoji("<:pause:1481532336679030815>").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vol_down").setEmoji("<:volumedown:1481532227467608138>").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vol_up").setEmoji("<:volume:1481532229623484487>").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("loop").setEmoji("<:loopsquare:1481532334808371311>").setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("stop").setEmoji("<:stop:1481571774234628096>").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("skip").setEmoji("<:angledoubleright:1481532342542663841>").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("autoplay").setEmoji("<:streaming:1481532239035633756>").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("queue").setEmoji("<:documentwriter:1481532241136844984>").setStyle(ButtonStyle.Secondary)
    );

    container.addActionRowComponents(row1, row2);
    return container;
}

/**
 * Create a ChatPlay idle container (no image, disabled buttons)
 */
function createChatPlayIdleContainer() {
    const container = new ContainerBuilder().setAccentColor(0xfacc15);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "### 🎧 Musicify ChatPlay\n" +
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
        new ButtonBuilder().setCustomId("shuffle").setEmoji("<:shuffle:1481532332543574137>").setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId("previous").setEmoji("<:angledoubleleft:1481532339459854386>").setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId("pause_resume").setEmoji("<:pause:1481532336679030815>").setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId("skip").setEmoji("<:angledoubleright:1481532342542663841>").setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId("loop").setEmoji("<:loopsquare:1481532334808371311>").setStyle(ButtonStyle.Secondary).setDisabled(true)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("autoplay").setEmoji("<:streaming:1481532239035633756>").setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId("vol_down").setEmoji("<:volumedown:1481532227467608138>").setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId("stop").setEmoji("<:stop:1481571774234628096>").setStyle(ButtonStyle.Danger).setDisabled(true),
        new ButtonBuilder().setCustomId("vol_up").setEmoji("<:volume:1481532229623484487>").setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId("queue").setEmoji("<:documentwriter:1481532241136844984>").setStyle(ButtonStyle.Secondary).setDisabled(true)
    );

    container.addActionRowComponents(row1, row2);

    return container;
}

/**
 * Create queue display container with pagination
 */
function createQueueContainer(queue, currentTrack, page = 0) {
    const container = new ContainerBuilder().setAccentColor(0xfacc15);
    const pageSize = 10;
    const totalTracks = queue ? queue.length : 0;
    const totalPages = Math.max(1, Math.ceil(totalTracks / pageSize));

    // Clamp page
    if (page < 0) page = 0;
    if (page >= totalPages) page = totalPages - 1;

    // --- Header ---
    let totalDuration = 0;
    if (currentTrack && currentTrack.info.length) totalDuration += currentTrack.info.length;
    if (queue && queue.length > 0) {
        for (const t of queue) {
            if (t.info.length) totalDuration += t.info.length;
        }
    }

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
                `**🎶 Now Playing**\n` +
                `-# **${currentTrack.info.title}**\n` +
                `-# ${currentTrack.info.author} · ${formatDuration(currentTrack.info.length)}`
            )
        );
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    }

    // --- Queue tracks ---
    if (!queue || queue.length === 0) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent("-# *No upcoming tracks in queue*")
        );
    } else {
        const start = page * pageSize;
        const end = Math.min(start + pageSize, queue.length);

        let queueText = "**Up Next**\n";
        for (let i = start; i < end; i++) {
            const t = queue[i];
            const duration = formatDuration(t.info.length);
            queueText += `-# **${i + 1}.** ${(t.info.title || "Unknown").substring(0, 45)} — *${(t.info.author || "?").substring(0, 25)}* \`${duration}\`\n`;
        }

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(queueText.trim())
        );
    }

    // --- Footer + Pagination buttons ---
    if (totalPages > 1) {
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# Page ${page + 1} of ${totalPages}`
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
    createIdleContainer,
    createChatPlayIdleContainer,
    createQueueContainer,
    formatDuration,
};
