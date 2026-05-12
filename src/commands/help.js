const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    AttachmentBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
} = require("discord.js");
const path = require("path");

const PAGES = {
    home: {
        label: "Home",
        emoji: "🏠",
        description: "Overview & quick start",
    },
    music: {
        label: "Music Commands",
        emoji: "🎶",
        description: "Play, skip, queue & more",
    },
    filters: {
        label: "Filters & Extras",
        emoji: "🎛️",
        description: "Audio filters, 24/7 & ChatPlay",
    },
    controls: {
        label: "Player Controls",
        emoji: "🎮",
        description: "Button layout guide",
    },
    troubleshoot: {
        label: "Troubleshooting",
        emoji: "🛠️",
        description: "Common issues & fixes",
    },
    support: {
        label: "Support",
        emoji: "🤝",
        description: "Get help & report bugs",
    },
};

/**
 * Build the dropdown select menu
 */
function buildDropdown(activePage = "home") {
    const menu = new StringSelectMenuBuilder()
        .setCustomId("help_select")
        .setPlaceholder("📖 Navigate help sections")
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
    const container = new ContainerBuilder();

    // --- Header with bot avatar ---
    const section = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# 🎧 Musicify"),
            new TextDisplayBuilder().setContent("-# Your premium music companion")
        )
        .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(
                client.user.displayAvatarURL({ size: 128 })
            )
        );

    container.addSectionComponents(section);

    // --- Category Dropdown (at the top, like the Command Browser) ---
    container.addActionRowComponents(buildDropdown(page));

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

    return container;
}

// ─── PAGE BUILDERS ───────────────────────────────────────────

function addHomePage(container) {
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "### 👋 Welcome to Musicify!\n" +
            "-# Your simple, fast, and feature-rich music bot for Discord."
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**Quick Start**\n\n" +
            "**1.** Join a voice channel\n" +
            "-# Make sure you're connected before requesting a song.\n\n" +
            "**2.** Use `/play <song name or URL>`\n" +
            "-# Search YouTube Music, Spotify, SoundCloud and more.\n\n" +
            "**3.** Control with buttons or commands!\n" +
            "-# Use the interactive player or slash commands."
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**Key Features**\n" +
            "-# 🎶 Song suggestions dropdown — 10 similar tracks\n" +
            "-# 🎛️ 10 audio filter presets\n" +
            "-# 💬 ChatPlay — type song names to play instantly\n" +
            "-# 📜 Smart queue with pagination\n" +
            "-# 🔁 24/7 mode — never leave the VC"
        )
    );
}

function addMusicPage(container) {
    // Command browser header
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "### 🎶 Command Browser\n" +
            "-# 15 commands available"
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Playback commands — numbered like Image 1
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**Playback**\n\n" +
            "**1.** `/play <query>`\n" +
            "-# Play a song or add it to the queue\n\n" +
            "**2.** `/skip`\n" +
            "-# Skip the current track\n\n" +
            "**3.** `/stop`\n" +
            "-# Stop playback, clear queue & disconnect\n\n" +
            "**4.** `/nowplaying`\n" +
            "-# Show the currently playing track with musicard\n\n" +
            "**5.** `/seek <time>`\n" +
            "-# Seek to a position *(e.g. 1:30 or 90)*"
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Queue management
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**Queue Management**\n\n" +
            "**6.** `/queue [page]`\n" +
            "-# View the current queue with pagination\n\n" +
            "**7.** `/remove <position>`\n" +
            "-# Remove a track from the queue\n\n" +
            "**8.** `/move <from> <to>`\n" +
            "-# Move a track to a different position\n\n" +
            "**9.** `/shuffle`\n" +
            "-# Shuffle all tracks in the queue\n\n" +
            "**10.** `/loop <off/track/queue>`\n" +
            "-# Set loop mode for track or queue"
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Settings
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**Settings**\n\n" +
            "**11.** `/volume <0-100>`\n" +
            "-# Set the playback volume\n\n" +
            "**12.** `/247`\n" +
            "-# Toggle 24/7 mode — stay in VC when idle\n\n" +
            "**13.** `/filter <preset>`\n" +
            "-# Apply an audio filter preset\n\n" +
            "**14.** `/chatplay <setup/enable/disable>`\n" +
            "-# Manage ChatPlay mode in a channel\n\n" +
            "**15.** `/about`\n" +
            "-# Learn more about Musicify"
        )
    );
}

function addFiltersPage(container) {
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "### 🎛️ Audio Filters\n" +
            "-# `/filter <preset>` — Apply an audio filter"
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**Available Presets**\n\n" +
            "**🔊 Bass Boost**\n-# Heavy low-end enhancement\n\n" +
            "**🌙 Nightcore**\n-# Sped up + higher pitch\n\n" +
            "**🌊 Vaporwave**\n-# Slowed down + lower pitch\n\n" +
            "**🎧 8D Audio**\n-# Rotating surround effect\n\n" +
            "**〰️ Tremolo**\n-# Volume oscillation\n\n" +
            "**🎸 Vibrato**\n-# Pitch oscillation\n\n" +
            "**🎤 Karaoke**\n-# Vocal reduction\n\n" +
            "**🔈 Low Pass**\n-# Muffled / underwater effect\n\n" +
            "**🐌 Slow Mode**\n-# Slowed playback rate\n\n" +
            "**💥 Distortion**\n-# Distorted audio effect\n\n" +
            "-# Use **❌ Reset All** to clear all active filters."
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "### 💬 ChatPlay\n\n" +
            "**Setup**\n" +
            "-# `/chatplay setup` — Send the persistent player message\n\n" +
            "**Enable / Disable**\n" +
            "-# `/chatplay enable` — Resume listening for song requests\n" +
            "-# `/chatplay disable` — Pause listening (keeps message)\n\n" +
            "-# Once set up, just **type a song name** in the channel and Musicify plays it automatically!"
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "### 🔁 24/7 Mode\n\n" +
            "**Toggle**\n" +
            "-# `/247` — Turn 24/7 mode on or off\n\n" +
            "**How it works**\n" +
            "-# Musicify stays in the voice channel even after the queue ends.\n" +
            "-# Setting persists across bot restarts."
        )
    );
}

function addControlsPage(container) {
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "### 🎮 Player Button Controls\n" +
            "-# When a track is playing, Musicify shows interactive buttons."
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**Row 1 — Playback**\n\n" +
            "**🔀 Shuffle**\n" +
            "-# Randomize the queue order\n\n" +
            "**⏮️ Previous**\n" +
            "-# Go back to the last played track\n\n" +
            "**⏸️ Pause / Play**\n" +
            "-# Toggle playback\n\n" +
            "**⏭️ Skip**\n" +
            "-# Skip to the next track\n\n" +
            "**🔁 Loop**\n" +
            "-# Cycle: Off → Track → Queue"
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**Row 2 — Extras**\n\n" +
            "**📻 Autoplay**\n" +
            "-# Auto-queue similar songs when queue ends\n\n" +
            "**🔉 Vol↓  ·  🔊 Vol↑**\n" +
            "-# Adjust volume by ±10%\n\n" +
            "**⏹️ Stop**\n" +
            "-# Stop playback and disconnect\n\n" +
            "**📜 Queue**\n" +
            "-# Open the queue viewer"
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**🎵 Song Suggestions**\n" +
            "-# A dropdown with up to **10 similar tracks** appears below the buttons.\n" +
            "-# Select one to instantly add it to the queue!"
        )
    );
}

function addTroubleshootPage(container) {
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "### 🛠️ Troubleshooting\n" +
            "-# Common issues and how to fix them."
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Grouped troubleshooting with bold labels + subtext like Image 2
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**Bot won't play music / Track Error**\n" +
            "-# The song may be age-restricted or region-blocked.\n" +
            "-# YouTube might be temporarily blocking the stream.\n" +
            "-# **Fix:** Try a different song or a direct Spotify/SoundCloud link.\n\n" +

            "**Bot joins but immediately leaves**\n" +
            "-# Musicify may lack Speak/Connect permissions in that channel.\n" +
            "-# The requested song may have failed to load.\n" +
            "-# **Fix:** Check bot permissions and try another song."
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**No sound but bot is in VC**\n" +
            "-# Check if the bot is paused — use the ▶️ button.\n" +
            "-# Check volume with `/volume`.\n" +
            "-# **Fix:** Make sure you're in the same VC and not deafened.\n\n" +

            "**ChatPlay not responding**\n" +
            "-# Ensure ChatPlay is enabled: `/chatplay enable`.\n" +
            "-# Make sure you're typing in the correct channel.\n" +
            "-# **Fix:** Try disabling and re-enabling it.\n\n" +

            "**Buttons say \"No active player\"**\n" +
            "-# The player was closed after the track finished.\n" +
            "-# **Fix:** Play a new song with `/play` to start fresh!"
        )
    );
}

function addSupportPage(container) {
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "### 🤝 Support & Links\n" +
            "-# Get help, report bugs, or learn more."
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**Need help or found a bug?**\n" +
            "-# Our team is ready to help you with any issues.\n" +
            "-# [Join our Support Discord](https://discord.gg/musicify)"
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**How to Report a Bug**\n\n" +
            "**1.** Note what command you were using\n" +
            "-# Include the exact command and any error shown.\n\n" +
            "**2.** Join our Support Server\n" +
            "-# [discord.gg/musicify](https://discord.gg/musicify)\n\n" +
            "**3.** Open a ticket\n" +
            "-# Or ask in the support channel.\n\n" +
            "**4.** Attach evidence\n" +
            "-# Screenshots or recordings help us fix faster!"
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**Bot Info Commands**\n\n" +
            "**1.** `/stats`\n" +
            "-# See ping, uptime, and memory\n\n" +
            "**2.** `/node`\n" +
            "-# See Lavalink connection status\n\n" +
            "**3.** `/help`\n" +
            "-# You're here! 😄"
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "-# Made with ❤️ by **Musicify Development**! Enjoy the music 🎶"
        )
    );
}

/**
 * Build the banner container (separate from the help content)
 */
function buildBannerContainer() {
    const banner = new ContainerBuilder();
    banner.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL("attachment://M_Banner.png")
        )
    );
    return banner;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Show all Musicify commands and features"),

    async execute(interaction, client) {
        const bannerPath = path.join(__dirname, "..", "..", ".github", "assets", "M_Banner.png");
        const bannerAttachment = new AttachmentBuilder(bannerPath, { name: "M_Banner.png" });
        const bannerContainer = buildBannerContainer();
        const container = buildHelpPage(client, "home");

        await interaction.reply({
            components: [bannerContainer, container],
            files: [bannerAttachment],
            flags: MessageFlags.IsComponentsV2,
        });
    },

    // Exports for use in buttonHandler
    buildHelpPage,
    buildBannerContainer,
};
