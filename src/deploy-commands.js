require("dotenv").config();

const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.data) {
        commands.push(command.data.toJSON());
    }
}

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

(async () => {
    try {
        console.log(`[Musicify] Registering ${commands.length} slash commands...`);

        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
            body: commands,
        });

        console.log("[Musicify] Slash commands registered successfully!");
    } catch (error) {
        console.error("[Musicify] Failed to register commands:", error);
    }
})();
