const { handleChatPlayMessage } = require("../handlers/chatPlayHandler");

module.exports = {
    name: "messageCreate",
    async execute(client, message) {
        // Ignore DMs
        if (!message.guild) return;

        // Handle ChatPlay messages
        await handleChatPlayMessage(client, message);
    },
};
