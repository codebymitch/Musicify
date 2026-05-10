const { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder } = require("discord.js");

const FILTER_PRESETS = {
    bassboost: { name: "Bass Boost", emoji: "🔊", apply: (p) => p.filters.setBassboost(true, { value: 4 }) },
    nightcore: { name: "Nightcore", emoji: "🌙", apply: (p) => p.filters.setTimescale(true, { speed: 1.2, pitch: 1.2, rate: 1.0 }) },
    vaporwave: { name: "Vaporwave", emoji: "🌊", apply: (p) => p.filters.setVaporwave(true, { pitch: 0.5 }) },
    "8d": { name: "8D Audio", emoji: "🎧", apply: (p) => p.filters.set8D(true, { rotationHz: 0.2 }) },
    tremolo: { name: "Tremolo", emoji: "〰️", apply: (p) => p.filters.setTremolo(true, { frequency: 4.0, depth: 0.75 }) },
    vibrato: { name: "Vibrato", emoji: "🎸", apply: (p) => p.filters.setVibrato(true, { frequency: 4.0, depth: 0.75 }) },
    karaoke: { name: "Karaoke", emoji: "🎤", apply: (p) => p.filters.setKaraoke(true, { level: 1.0, monoLevel: 1.0, filterBand: 220.0, filterWidth: 100.0 }) },
    lowpass: { name: "Low Pass", emoji: "🔈", apply: (p) => p.filters.setLowPass(true, { smoothing: 20.0 }) },
    slowmode: { name: "Slow Mode", emoji: "🐌", apply: (p) => p.filters.setSlowmode(true, { rate: 0.8 }) },
    distortion: { name: "Distortion", emoji: "💥", apply: (p) => p.filters.setDistortion(true, { sinOffset: 0, sinScale: 1, cosOffset: 0, cosScale: 1, tanOffset: 0, tanScale: 1, offset: 0, scale: 1 }) },
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("filter")
        .setDescription("Apply audio filters to the player")
        .addStringOption((opt) =>
            opt.setName("preset").setDescription("Filter preset to apply").setRequired(true)
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
            return interaction.reply({ content: "❌ Nothing is playing right now.", flags: MessageFlags.Ephemeral });
        }
        if (!interaction.member.voice?.channel) {
            return interaction.reply({ content: "❌ You need to be in a voice channel!", flags: MessageFlags.Ephemeral });
        }

        const preset = interaction.options.getString("preset");

        if (preset === "reset") {
            player.filters.clearFilters();
            const container = new ContainerBuilder().setAccentColor(0xfacc15);
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### ❌ Filters Reset\n\n" +
                    "**Status**\n" +
                    "-# All audio filters have been cleared."
                )
            );
            return interaction.reply({
                components: [container],
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            });
        }

        const filter = FILTER_PRESETS[preset];
        if (!filter) {
            return interaction.reply({ content: "❌ Unknown filter preset.", flags: MessageFlags.Ephemeral });
        }

        try {
            filter.apply(player);
        } catch (err) {
            console.error(`[Musicify] Filter "${preset}" error:`, err.message);
            return interaction.reply({
                content: `❌ Failed to apply **${filter.name}**. It may not be supported by the current node.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        const container = new ContainerBuilder().setAccentColor(0xfacc15);
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${filter.emoji} Filter Applied\n\n` +
                "**Preset**\n" +
                `-# ${filter.name}\n\n` +
                "**Track**\n" +
                `-# ${player.current.info.title}`
            )
        );
        await interaction.reply({
            components: [container],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
    },
};
