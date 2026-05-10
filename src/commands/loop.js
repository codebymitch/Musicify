const { SlashCommandBuilder, MessageFlags } = require("discord.js");
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

        if (!interaction.member.voice?.channel) {
            return interaction.reply({
                content: "❌ You need to be in a voice channel!",
                flags: MessageFlags.Ephemeral,
            });
        }

        const mode = interaction.options.getString("mode");
        const guildData = getGuildData(interaction.guild.id);
        guildData.loop = mode;
        player.setLoop(mode);

        const labels = { none: "Off", track: "Track", queue: "Queue" };
        await interaction.reply({
            content: `🔁 Loop set to **${labels[mode]}**`,
            flags: MessageFlags.Ephemeral,
        });
    },
};
