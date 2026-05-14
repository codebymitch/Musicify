const { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require("discord.js");
const { getGuildData } = require("../utils/playerStore");
const { createChatPlayIdleContainer } = require("../utils/components");
const { setGuildSetting, deleteGuildSetting } = require("../utils/database");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("chatplay")
        .setDescription("Manage ChatPlay mode")
        .addSubcommand((sub) =>
            sub.setName("setup").setDescription("Set up ChatPlay in this channel (sends persistent message)")
        )
        .addSubcommand((sub) =>
            sub.setName("enable").setDescription("Enable ChatPlay in a previously set up channel")
        )
        .addSubcommand((sub) =>
            sub.setName("disable").setDescription("Disable ChatPlay (keeps the message but stops listening)")
        ),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const guildData = getGuildData(guildId);

        if (sub === "setup") {
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

            const container = createChatPlayIdleContainer();
            const chatMsg = await interaction.channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });

            // Set slowmode to prevent spam (5 seconds)
            try {
                await interaction.channel.setRateLimitPerUser(5, "ChatPlay setup - prevents spam");
            } catch (err) {
                // Bot may lack Manage Channel permission
            }

            guildData.chatPlayChannelId = interaction.channel.id;
            guildData.chatPlayMessageId = chatMsg.id;
            guildData.chatPlayEnabled = true;
            guildData.playerChannelId = interaction.channel.id;

            setGuildSetting(guildId, "chatPlayChannelId", interaction.channel.id);
            setGuildSetting(guildId, "chatPlayMessageId", chatMsg.id);
            setGuildSetting(guildId, "chatPlayEnabled", true);

            const reply = new ContainerBuilder();
            reply.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### ✅ ChatPlay Setup Complete\n\n" +
                    "**Channel**\n" +
                    `-# <#${interaction.channel.id}>\n\n` +
                    "**How to use**\n" +
                    "-# Just type a song name in this channel to play it!"
                )
            );
            await interaction.reply({
                components: [reply],
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            });

        } else if (sub === "enable") {
            if (!guildData.chatPlayChannelId) {
                return interaction.reply({
                    content: "❌ ChatPlay hasn't been set up yet. Use `/chatplay setup` first.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            guildData.chatPlayEnabled = true;
            setGuildSetting(guildId, "chatPlayEnabled", true);

            const reply = new ContainerBuilder();
            reply.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### ChatPlay Enabled" +
                    "**Status**" +
                    "-# Listening for song requests." +
                    "**Channel**" +
                    `-# <#${guildData.chatPlayChannelId}>`
                )
            );
            await interaction.reply({
                components: [reply],
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            });

        } else if (sub === "disable") {
            if (!guildData.chatPlayChannelId) {
                return interaction.reply({
                    content: "❌ ChatPlay is not set up in any channel.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            guildData.chatPlayEnabled = false;
            setGuildSetting(guildId, "chatPlayEnabled", false);

            const reply = new ContainerBuilder();
            reply.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### ⏸ ChatPlay Disabled\n\n" +
                    "**Status**\n" +
                    "-# Paused — the player message is kept.\n\n" +
                    "**Resume**\n" +
                    "-# Use `/chatplay enable` to start listening again."
                )
            );
            await interaction.reply({
                components: [reply],
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            });
        }
    },
};
