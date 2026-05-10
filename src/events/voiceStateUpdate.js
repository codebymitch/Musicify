const { getGuildData, deleteGuildData } = require("../utils/playerStore");

module.exports = {
    name: "voiceStateUpdate",
    async execute(client, oldState, newState) {
        // Check if the bot was disconnected from a voice channel
        if (oldState.id === client.user.id && !newState.channelId) {
            const player = client.riffy.players.get(oldState.guild.id);
            if (player) {
                player.destroy();
            }
            return;
        }

        // Check if bot is alone in VC
        if (oldState.channelId && oldState.channel) {
            const botMember = oldState.guild.members.cache.get(client.user.id);
            if (botMember?.voice?.channel) {
                const members = botMember.voice.channel.members.filter(
                    (m) => !m.user.bot
                );
                if (members.size === 0) {
                    // Skip auto-disconnect if 24/7 mode is enabled
                    const guildData = getGuildData(oldState.guild.id);
                    if (guildData.twentyFourSeven) return;

                    // Bot is alone, disconnect after 30 seconds
                    setTimeout(() => {
                        const currentChannel = oldState.guild.members.cache
                            .get(client.user.id)
                            ?.voice?.channel;
                        if (currentChannel) {
                            const currentMembers = currentChannel.members.filter(
                                (m) => !m.user.bot
                            );
                            if (currentMembers.size === 0) {
                                // Re-check 24/7 in case it was toggled during the timeout
                                const currentGuildData = getGuildData(oldState.guild.id);
                                if (currentGuildData.twentyFourSeven) return;

                                const player = client.riffy.players.get(
                                    oldState.guild.id
                                );
                                if (player) {
                                    player.destroy();
                                }
                            }
                        }
                    }, 30000);
                }
            }
        }
    },
};
