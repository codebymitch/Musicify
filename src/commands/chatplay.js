const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require("discord.js");
const { getGuildData } = require("../utils/playerStore");
const { createChatPlayIdleContainer } = require("../utils/components");
const { setGuildSetting, deleteGuildSetting } = require("../utils/database");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("chatplay")
        .setDescription("Manage ChatPlay mode")
        .addSubcommand((sub) =>
            sub
                .setName("setup")
                .setDescription("Set up ChatPlay in this channel (sends persistent message)")
        )
        .addSubcommand((sub) =>
            sub
                .setName("enable")
                .setDescription("Enable ChatPlay in a previously set up channel")
        )
        .addSubcommand((sub) =>
            sub
                .setName("disable")
                .setDescription("Disable ChatPlay (keeps the message but stops listening)")
        ),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const guildData = getGuildData(guildId);

        if (sub === "setup") {
            // --- SETUP: send idle message in this channel ---

            // Clean up old ChatPlay message if it exists
            if (guildData.chatPlayChannelId && guildData.chatPlayMessageId) {
                try {
                    const oldChannel = client.channels.cache.get(guildData.chatPlayChannelId);
                    if (oldChannel) {
                        const oldMsg = await oldChannel.messages.fetch(guildData.chatPlayMessageId);
                        await oldMsg.delete();
                    }
                } catch (err) {
                    // ignore
                }
            }

            // Send the idle container
            const container = createChatPlayIdleContainer();
            const chatMsg = await interaction.channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });

            // Store state in memory
            guildData.chatPlayChannelId = interaction.channel.id;
            guildData.chatPlayMessageId = chatMsg.id;
            guildData.chatPlayEnabled = true;
            guildData.playerChannelId = interaction.channel.id;

            // Persist to JSON database
            setGuildSetting(guildId, "chatPlayChannelId", interaction.channel.id);
            setGuildSetting(guildId, "chatPlayMessageId", chatMsg.id);
            setGuildSetting(guildId, "chatPlayEnabled", true);

            await interaction.reply({
                content: "✅ ChatPlay set up in this channel! Type a song name to play.",
                flags: MessageFlags.Ephemeral,
            });

        } else if (sub === "enable") {
            // --- ENABLE: turn on listening ---
            if (!guildData.chatPlayChannelId) {
                return interaction.reply({
                    content: "❌ ChatPlay hasn't been set up yet. Use `/chatplay setup` first.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            guildData.chatPlayEnabled = true;
            setGuildSetting(guildId, "chatPlayEnabled", true);

            await interaction.reply({
                content: "✅ ChatPlay is now **enabled**. Type song names to play!",
                flags: MessageFlags.Ephemeral,
            });

        } else if (sub === "disable") {
            // --- DISABLE: stop listening but keep message ---
            if (!guildData.chatPlayChannelId) {
                return interaction.reply({
                    content: "❌ ChatPlay is not set up in any channel.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            guildData.chatPlayEnabled = false;
            setGuildSetting(guildId, "chatPlayEnabled", false);

            await interaction.reply({
                content: "⏸ ChatPlay is now **disabled**. The message is kept — use `/chatplay enable` to resume.",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
