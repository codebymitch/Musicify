const { SlashCommandBuilder, MessageFlags } = require("discord.js");

const FILTER_PRESETS = {
    bassboost: {
        name: "Bass Boost",
        emoji: "🔊",
        apply: (player) => player.filters.setBassboost(true, { value: 4 }),
    },
    nightcore: {
        name: "Nightcore",
        emoji: "🌙",
        apply: (player) =>
            player.filters.setTimescale(true, { speed: 1.2, pitch: 1.2, rate: 1.0 }),
    },
    vaporwave: {
        name: "Vaporwave",
        emoji: "🌊",
        apply: (player) =>
            player.filters.setVaporwave(true, { pitch: 0.5 }),
    },
    "8d": {
        name: "8D Audio",
        emoji: "🎧",
        apply: (player) =>
            player.filters.set8D(true, { rotationHz: 0.2 }),
    },
    tremolo: {
        name: "Tremolo",
        emoji: "〰️",
        apply: (player) =>
            player.filters.setTremolo(true, { frequency: 4.0, depth: 0.75 }),
    },
    vibrato: {
        name: "Vibrato",
        emoji: "🎸",
        apply: (player) =>
            player.filters.setVibrato(true, { frequency: 4.0, depth: 0.75 }),
    },
    karaoke: {
        name: "Karaoke",
        emoji: "🎤",
        apply: (player) =>
            player.filters.setKaraoke(true, {
                level: 1.0,
                monoLevel: 1.0,
                filterBand: 220.0,
                filterWidth: 100.0,
            }),
    },
    lowpass: {
        name: "Low Pass",
        emoji: "🔈",
        apply: (player) =>
            player.filters.setLowPass(true, { smoothing: 20.0 }),
    },
    slowmode: {
        name: "Slow Mode",
        emoji: "🐌",
        apply: (player) =>
            player.filters.setSlowmode(true, { rate: 0.8 }),
    },
    distortion: {
        name: "Distortion",
        emoji: "💥",
        apply: (player) =>
            player.filters.setDistortion(true, {
                sinOffset: 0,
                sinScale: 1,
                cosOffset: 0,
                cosScale: 1,
                tanOffset: 0,
                tanScale: 1,
                offset: 0,
                scale: 1,
            }),
    },
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("filter")
        .setDescription("Apply audio filters to the player")
        .addStringOption((opt) =>
            opt
                .setName("preset")
                .setDescription("Filter preset to apply")
                .setRequired(true)
                .addChoices(
                    { name: "🔊 Bass Boost", value: "bassboost" },
                    { name: "🌙 Nightcore", value: "nightcore" },
                    { name: "🌊 Vaporwave", value: "vaporwave" },
                    { name: "🎧 8D Audio", value: "8d" },
                    { name: "〰️ Tremolo", value: "tremolo" },
                    { name: "🎸 Vibrato", value: "vibrato" },
                    { name: "🎤 Karaoke", value: "karaoke" },
                    { name: "🔈 Low Pass", value: "lowpass" },
                    { name: "🐌 Slow Mode", value: "slowmode" },
                    { name: "💥 Distortion", value: "distortion" },
                    { name: "❌ Reset All", value: "reset" }
                )
        ),

    async execute(interaction, client) {
        const player = client.riffy.players.get(interaction.guild.id);
        if (!player || !player.current) {
            return interaction.reply({
                content: "❌ Nothing is playing right now.",
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!interaction.member.voice?.channel) {
            return interaction.reply({
                content: "❌ You need to be in a voice channel!",
                flags: MessageFlags.Ephemeral,
            });
        }

        const preset = interaction.options.getString("preset");

        if (preset === "reset") {
            player.filters.clearFilters();
            return interaction.reply({
                content: "✅ All filters have been **reset**.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const filter = FILTER_PRESETS[preset];
        if (!filter) {
            return interaction.reply({
                content: "❌ Unknown filter preset.",
                flags: MessageFlags.Ephemeral,
            });
        }

        filter.apply(player);

        await interaction.reply({
            content: `${filter.emoji} Applied **${filter.name}** filter!`,
            flags: MessageFlags.Ephemeral,
        });
    },
};
