const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ChannelSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionFlagsBits,
} = require("discord.js");
const { getGuildData } = require("../utils/playerStore");
const { createChatPlayIdleContainer } = require("../utils/components");
const { setGuildSetting, deleteGuildSetting } = require("../utils/database");

/**
 * Build the interactive onboard setup panel
 */
function buildOnboardPanel(client, guildData) {
    const container = new ContainerBuilder();

    const isSetUp = !!guildData.chatPlayChannelId;

    // --- Header ---
    const header = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "## 🎵 Musicify Onboard\n" +
                (isSetUp
                    ? "-# Your music setup is ready!"
                    : "-# Configure your server's music experience")
            )
        )
        .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(
                client.user.displayAvatarURL({ size: 128 })
            )
        );
    container.addSectionComponents(header);

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // --- ChatPlay Channel Status ---
    const chatPlayStatus = guildData.chatPlayChannelId
        ? `✅ <#${guildData.chatPlayChannelId}>`
        : "Not set — select a text channel below";
    const chatPlayActiveStatus = guildData.chatPlayEnabled ? " · 🟢 Active" : " · 🔴 Paused";

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**ChatPlay Channel**\n" +
            `-# ${chatPlayStatus}${guildData.chatPlayChannelId ? chatPlayActiveStatus : ""}`
        )
    );

    // Text channel select menu
    const textSelect = new ChannelSelectMenuBuilder()
        .setCustomId("onboard_text_select")
        .setPlaceholder("💬 Select a text channel for ChatPlay")
        .setChannelTypes(ChannelType.GuildText)
        .setMinValues(1)
        .setMaxValues(1);

    container.addActionRowComponents(new ActionRowBuilder().addComponents(textSelect));

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // --- Voice Channel Status ---
    const vcStatus = guildData.defaultVoiceChannel
        ? `✅ <#${guildData.defaultVoiceChannel}>`
        : "Not set — select a voice channel below";

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**Voice Channel**\n" +
            `-# ${vcStatus}`
        )
    );

    // Voice channel select menu
    const voiceSelect = new ChannelSelectMenuBuilder()
        .setCustomId("onboard_voice_select")
        .setPlaceholder("🔊 Select a voice channel")
        .setChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        .setMinValues(1)
        .setMaxValues(1);

    container.addActionRowComponents(new ActionRowBuilder().addComponents(voiceSelect));

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // --- 24/7 Stay + Actions ---
    const stayEmoji = guildData.twentyFourSeven ? "✅" : "❌";
    const stayLabel = guildData.twentyFourSeven ? "Enabled" : "Disabled";
    const stayDesc = guildData.twentyFourSeven
        ? "Bot stays in VC even when queue ends"
        : "Bot leaves VC when queue ends";

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `**24/7 Stay**: ${stayEmoji} ${stayLabel}\n` +
            `-# ${stayDesc}`
        )
    );

    // Action buttons
    const stayButton = new ButtonBuilder()
        .setCustomId("onboard_247")
        .setLabel(guildData.twentyFourSeven ? "Disable 24/7" : "Enable 24/7")
        .setEmoji(guildData.twentyFourSeven ? "⏹" : "🔁")
        .setStyle(guildData.twentyFourSeven ? ButtonStyle.Secondary : ButtonStyle.Primary);

    const resetButton = new ButtonBuilder()
        .setCustomId("onboard_reset")
        .setLabel("Reset Setup")
        .setEmoji("🗑️")
        .setStyle(ButtonStyle.Danger);

    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(stayButton, resetButton)
    );

    return container;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("onboard")
        .setDescription("Set up ChatPlay and configure your server's music experience")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction, client) {
        const guildData = getGuildData(interaction.guild.id);
        const container = buildOnboardPanel(client, guildData);

        await interaction.reply({
            components: [container],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
    },

    // Exported for use in buttonHandler
    buildOnboardPanel,
};
