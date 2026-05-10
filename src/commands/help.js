const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} = require("discord.js");

const PAGES = {
    home: {
        label: "Home",
        emoji: "<:home:1481573718252847126>",
        description: "Overview & quick start",
    },
    music: {
        label: "Music Commands",
        emoji: "<:waveformpath:1481573862549356645>",
        description: "Play, skip, queue & more",
    },
    filters: {
        label: "Filters & Extras",
        emoji: "<:settingssliders:1481574683403882659>",
        description: "Audio filters, 24/7 & ChatPlay",
    },
    controls: {
        label: "Player Controls",
        emoji: "<:multiplayer:1481574025871233135>",
        description: "Button layout guide",
    },
    troubleshoot: {
        label: "Troubleshooting",
        emoji: "<:starshooting:1481574681109729322>",
        description: "Common issues & fixes",
    },
    support: {
        label: "Support",
        emoji: "<:heartpartnerhandshake:1481574678584754226>",
        description: "Get help & report bugs",
    },
};

/**
 * Build the dropdown select menu
 */
function buildDropdown(activePage = "home") {
    const menu = new StringSelectMenuBuilder()
        .setCustomId("help_select")
        .setPlaceholder(" Navigate help sections")
        .setMinValues(1)
        .setMaxValues(1);

    for (const [key, page] of Object.entries(PAGES)) {
        menu.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(page.label)
                .setDescription(page.description)
                .setEmoji(page.emoji)
                .setValue(key)
                .setDefault(key === activePage)
        );
    }

    return new ActionRowBuilder().addComponents(menu);
}

/**
 * Build the full container for a given page
 */
function buildHelpPage(client, page = "home") {
    const container = new ContainerBuilder().setAccentColor(0xfacc15);

    // --- Header ---
    const section = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# <:headphones:1481576140706676829> Musicify"),
            new TextDisplayBuilder().setContent("-# Your premium music companion")
        )
        .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(
                client.user.displayAvatarURL({ size: 128 })
            )
        );

    container.addSectionComponents(section);

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // --- Page Content ---
    switch (page) {
        case "home":
            addHomePage(container);
            break;
        case "music":
            addMusicPage(container);
            break;
        case "filters":
            addFiltersPage(container);
            break;
        case "controls":
            addControlsPage(container);
            break;
        case "troubleshoot":
            addTroubleshootPage(container);
            break;
        case "support":
            addSupportPage(container);
            break;
        default:
            addHomePage(container);
    }

    // --- Dropdown (at the bottom) ---
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addActionRowComponents(buildDropdown(page));

    return container;
}

// ─── PAGE BUILDERS ───────────────────────────────────────────

function addHomePage(container) {
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "### 👋 Welcome to Musicify!\n" +
            "-# Your simple, fast, and feature-rich music bot for Discord.\n\n" +
            "** Quick Start**\n" +
            "-# <:square1:1481577266323390464> Join a voice channel\n" +
            "-# <:square2:1481577264281030717> Use `/play <song name or URL>`\n" +
            "-# <:square3:1481577261458264064> Control music with buttons or commands!"
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "** Key Features**\n" +
            "-#  Song suggestions dropdown (10 similar tracks)\n" +
            "-#  8 awesome audio filter presets\n" +
            "-#  ChatPlay — just type song names to play instantly\n" +
            "-#  Smart queue with pagination\n" +
            "-#  24/7 mode — never leave the VC"
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "-#  Use the dropdown above to explore all features, controls & support."
        )
    );
}

function addMusicPage(container) {
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "###  Music Commands\n\n" +
            "**Playback**\n" +
            "-# `/play <query>` — Play a song or add to queue\n" +
            "-# `/skip` — Skip the current track\n" +
            "-# `/stop` — Stop playback & disconnect\n" +
            "-# `/nowplaying` — Show current track info\n" +
            "-# `/seek <time>` — Seek to position *(e.g. 1:30, 90s)*\n" +
            "-# `/lyrics` — Get lyrics for current track"
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**Queue Management**\n" +
            "-# `/queue [page]` — View the current queue\n" +
            "-# `/remove <position>` — Remove a track from queue\n" +
            "-# `/move <from> <to>` — Reorder tracks in queue\n" +
            "-# `/shuffle` — Shuffle the queue\n" +
            "-# `/loop <off/track/queue>` — Set loop mode"
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**Settings**\n" +
            "-# `/volume <0-150>` — Set playback volume\n" +
            "-# `/247` — Toggle 24/7 mode (stay in VC)"
        )
    );
}

function addFiltersPage(container) {
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "### <:settingssliders:1481574683403882659> Audio Filters\n\n" +
            "-# `/filter <preset>` — Apply an audio filter\n\n" +
            "**Available Presets**\n" +
            "-#  **Bass Boost** — Heavy low-end enhancement\n" +
            "-#  **Nightcore** — Sped up + higher pitch\n" +
            "-#  **Vaporwave** — Slowed down + lower pitch\n" +
            "-#  **8D** — Rotating surround effect\n" +
            "-#  **Tremolo** — Volume oscillation\n" +
            "-#  **Vibrato** — Pitch oscillation\n" +
            "-#  **Karaoke** — Vocal reduction\n" +
            "-#  **Low Pass** — Muffled/underwater effect\n\n" +
            "-# Use **Reset All** to clear all active filters."
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "###  ChatPlay\n\n" +
            "-# `/chatplay setup` — Set up ChatPlay in a channel\n" +
            "-# `/chatplay enable` — Resume listening\n" +
            "-# `/chatplay disable` — Pause listening (keeps message)\n\n" +
            "-# Once set up, just **type a song name** in the channel — Musicify plays it automatically!"
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "###  24/7 Mode\n\n" +
            "-# `/247` — Toggle 24/7 mode\n" +
            "-# When enabled, Musicify stays in the VC even after the queue ends.\n" +
            "-# Setting persists across bot restarts."
        )
    );
}

function addControlsPage(container) {
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "### <:multiplayer:1481574025871233135> Player Button Controls\n\n" +
            "When a track is playing, Musicify shows interactive buttons:\n\n" +
            "**Row 1 — Playback**\n" +
            "-# <:shuffle:1481532332543574137> Shuffle · <:angledoubleleft:1481532339459854386> Previous · <:pause:1481532344920834130> Pause · <:angledoubleright:1481532342542663841> Skip · <:loopsquare:1481532334808371311> Loop\n\n" +
            "**Row 2 — Extras**\n" +
            "-# <:streaming:1481532239035633756> Autoplay · <:volumedown:1481532227467608138> Vol↓ · <:stop:1481571774234628096> Stop · <:volume:1481532229623484487> Vol↑ · <:queue:1481571776262665216> Queue"
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "** Song Suggestions**\n" +
            "-# Below the buttons, a dropdown shows up to **10 similar tracks**.\n" +
            "-# Select one to instantly add it to the queue!\n\n"
        )
    );
}

function addTroubleshootPage(container) {
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "### <:starshooting:1481574681109729322> Troubleshooting\n\n" +
            "**Bot won't play music / Track Error**\n" +
            "-# • The song might be age-restricted or blocked in this region.\n" +
            "-# • YouTube might be temporarily blocking the stream.\n" +
            "-# • **Fix:** Try using a different song or a direct Spotify/SoundCloud link instead."
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**Bot joins but immediately leaves**\n" +
            "-# • Musicify might not have permission to speak or play audio in that channel.\n" +
            "-# • The song you requested might have immediately failed to load.\n" +
            "-# • Check if the server's music connection is currently stable."
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**No sound but bot is in VC**\n" +
            "-# • Check if the bot is paused (use the ▶️ button or `/nowplaying`).\n" +
            "-# • Check your server/bot volume (`/volume`).\n" +
            "-# • Make sure you're in the same VC as the bot and not deafened."
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**ChatPlay not responding**\n" +
            "-# • Ensure ChatPlay is enabled in your channel: `/chatplay enable`.\n" +
            "-# • Make sure you are typing in the exact channel you set up ChatPlay in.\n" +
            "-# • Try disabling and re-enabling it."
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**Buttons say \"No active player\"**\n" +
            "-# • The track finished and the player was closed.\n" +
            "-# • Simply play a new song with `/play` to start fresh!"
        )
    );
}

function addSupportPage(container) {
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "###  Support & Links\n\n" +
            "**Need help or found a bug?**\n" +
            "-#  [Join our Support Discord](https://discord.gg/musicify)\n" +
            "-# \n" +
            "-# Our team is there to help you out with any issues or answer your questions."
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "** How to Report a Bug**\n" +
            "-# <:square1:1481577266323390464> Note what command you were trying to use\n" +
            "-# <:square2:1481577268557162567> Join our [Support Server](https://discord.gg/musicify)\n" +
            "-# 3 Open a ticket or ask in the support channel\n" +
            "-# 4️⃣ If you have screenshots or a recording, please include them!"
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "** Bot Info Commands**\n" +
            "-# `/bot-stats` — See ping and uptime\n" +
            "-# `/node-stats` — See music connection status\n" +
            "-# `/help` — You're here! 😄"
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "-# Made with ❤️ by **Musicify Development**! Enjoy the music 🎶"
        )
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Show all Musicify commands and features"),

    async execute(interaction, client) {
        const container = buildHelpPage(client, "home");

        await interaction.reply({
            components: [container],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
    },

    // Export for use in buttonHandler
    buildHelpPage,
};
