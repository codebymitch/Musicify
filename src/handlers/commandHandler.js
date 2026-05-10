const fs = require("fs");
const path = require("path");
const { Collection } = require("discord.js");

/**
 * Load all slash commands from the commands directory
 */
function loadCommands(client) {
    client.commands = new Collection();

    const commandsPath = path.join(__dirname, "..", "commands");

    if (!fs.existsSync(commandsPath)) {
        console.warn("[Musicify] No commands directory found.");
        return;
    }

    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
            try {
                const command = require(path.join(commandsPath, file));
                if (command.data && command.execute) {
                    client.commands.set(command.data.name, command);
                    console.log(`[Musicify] Loaded command: /${command.data.name}`);
                } else {
                    console.warn(`[Musicify] Command ${file} is missing "data" or "execute".`);
                }
            } catch (err) {
                console.error(`[Musicify] Failed to load command ${file}:`, err.message);
            }
    }
}

module.exports = { loadCommands };
