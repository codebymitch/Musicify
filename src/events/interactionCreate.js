const { MessageFlags } = require("discord.js");
const { handleButtonInteraction } = require("../handlers/buttonHandler");

module.exports = {
    name: "interactionCreate",
    async execute(client, interaction) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`[Musicify] Command error (${interaction.commandName}):`, error);
                
                // Handle expired interactions
                if (error.code === 10062) {
                    console.log("[Musicify] Interaction expired - unable to respond");
                    return;
                }
                
                const reply = { content: "An error occurred.", flags: MessageFlags.Ephemeral };
                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(reply);
                    } else {
                        await interaction.reply(reply);
                    }
                } catch (replyError) {
                    if (replyError.code === 10062) {
                        console.log("[Musicify] Interaction expired during error reply");
                    } else {
                        console.error("[Musicify] Error sending error reply:", replyError);
                    }
                }
            }
            return;
        }

        // Handle buttons and select menus
        if (interaction.isButton() || interaction.isStringSelectMenu()) {
            try {
                await handleButtonInteraction(client, interaction);
            } catch (error) {
                console.error("[Musicify] Interaction error:", error);
                try {
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.deferUpdate();
                    }
                } catch (e) {
                    // ignore
                }
            }
        }
    },
};
