const { SlashCommandBuilder, MessageFlags } = require("discord.js");

const FILTER_PRESETS = {
    bassboost: {
        name: "Bass Boost",
        emoji: "🔊",
        equalizer: [
            { band: 0, gain: 0.6 },
            { band: 1, gain: 0.5 },
            { band: 2, gain: 0.4 },
            { band: 3, gain: 0.3 },
            { band: 4, gain: 0.15 },
        ],
    },
    nightcore: {
        name: "Nightcore",
        emoji: "🌙",
        timescale: { speed: 1.2, pitch: 1.2, rate: 1.0 },
    },
    vaporwave: {
        name: "Vaporwave",
        emoji: "🌊",
        timescale: { speed: 0.85, pitch: 0.85, rate: 1.0 },
    },
    "8d": {
        name: "8D Audio",
        emoji: "🎧",
        rotation: { rotationHz: 0.2 },
    },
    tremolo: {
        name: "Tremolo",
        emoji: "〰️",
        tremolo: { frequency: 4.0, depth: 0.75 },
    },
    vibrato: {
        name: "Vibrato",
        emoji: "🎸",
        vibrato: { frequency: 4.0, depth: 0.75 },
    },
    karaoke: {
        name: "Karaoke",
        emoji: "🎤",
        karaoke: { level: 1.0, monoLevel: 1.0, filterBand: 220.0, filterWidth: 100.0 },
    },
    lowpass: {
        name: "Low Pass",
        emoji: "🔈",
        lowPass: { smoothing: 20.0 },
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
            // Reset all filters
            player.node.rest.updatePlayer({
                guildId: interaction.guild.id,
                data: {
                    filters: {},
                },
            });

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

        // Build the filters object
        const filters = {};
        if (filter.equalizer) filters.equalizer = filter.equalizer;
        if (filter.timescale) filters.timescale = filter.timescale;
        if (filter.rotation) filters.rotation = filter.rotation;
        if (filter.tremolo) filters.tremolo = filter.tremolo;
        if (filter.vibrato) filters.vibrato = filter.vibrato;
        if (filter.karaoke) filters.karaoke = filter.karaoke;
        if (filter.lowPass) filters.lowPass = filter.lowPass;

        player.node.rest.updatePlayer({
            guildId: interaction.guild.id,
            data: { filters },
        });

        await interaction.reply({
            content: `${filter.emoji} Applied **${filter.name}** filter!`,
            flags: MessageFlags.Ephemeral,
        });
    },
};
