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
                const reply = { content: "An error occurred.", flags: MessageFlags.Ephemeral };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
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
