const { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder } = require("discord.js");
const { getGuildData } = require("../utils/playerStore");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("loop")
        .setDescription("Set loop mode")
        .addStringOption((opt) =>
            opt
                .setName("mode")
                .setDescription("Loop mode")
                .setRequired(true)
                .addChoices(
                    { name: "Off", value: "none" },
                    { name: "Track", value: "track" },
                    { name: "Queue", value: "queue" }
                )
        ),

    async execute(interaction, client) {
        const player = client.riffy.players.get(interaction.guild.id);
        if (!player) {
            return interaction.reply({
                content: "❌ No active player.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const { canControlMusic, VOICE_CHANNEL_DENIAL } = require("../utils/permissions");
        if (!canControlMusic(interaction.member, player)) {
            return interaction.reply({
                content: VOICE_CHANNEL_DENIAL,
                flags: MessageFlags.Ephemeral,
            });
        }

        const mode = interaction.options.getString("mode");
        const guildData = getGuildData(interaction.guild.id);
        guildData.loop = mode;
        player.setLoop(mode);

        const labels = { none: "Off", track: "Track", queue: "Queue" };
        const emojis = { none: "➡️", track: "🔂", queue: "🔁" };

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${emojis[mode]} Loop Updated\n\n` +
                "**Mode**\n" +
                `-# ${labels[mode]}`
            )
        );
        await interaction.reply({
            components: [container],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
    },
};
