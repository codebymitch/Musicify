const { MessageFlags } = require("discord.js");
const { createChatPlayIdleContainer } = require("./components");

/**
 * Reset the ChatPlay persistent message back to idle state.
 * Safe to call even if the message was already deleted.
 */
async function resetChatPlayToIdle(client, guildData) {
    if (!guildData.chatPlayChannelId || !guildData.chatPlayMessageId) return;
    try {
        const channel = client.channels.cache.get(guildData.chatPlayChannelId);
        if (channel) {
            const msg = await channel.messages.fetch(guildData.chatPlayMessageId);
            await msg.edit({
                components: [createChatPlayIdleContainer()],
                attachments: [],
                flags: MessageFlags.IsComponentsV2,
            });
        }
    } catch (err) {
        // message may have been deleted
    }
}

/**
 * Delete the regular /play player message and clear stale IDs.
 */
async function deletePlayerMessage(client, guildData) {
    if (!guildData.playerMessageId || !guildData.playerChannelId) return;
    try {
        const channel = client.channels.cache.get(guildData.playerChannelId);
        if (channel) {
            const msg = await channel.messages.fetch(guildData.playerMessageId);
            await msg.delete();
        }
    } catch (err) {
        // message already deleted
    }
    guildData.playerMessageId = null;
    guildData.playerChannelId = null;
}

/**
 * Clean up the player UI — resets ChatPlay to idle OR deletes /play message.
 */
async function cleanupPlayerUI(client, guildData) {
    if (guildData.chatPlayChannelId && guildData.chatPlayMessageId) {
        await resetChatPlayToIdle(client, guildData);
    } else {
        await deletePlayerMessage(client, guildData);
    }
}

module.exports = { resetChatPlayToIdle, deletePlayerMessage, cleanupPlayerUI };
