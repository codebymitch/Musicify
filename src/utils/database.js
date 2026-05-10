const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "..", "data", "guilds.json");

/**
 * Ensure the data directory and file exist
 */
function ensureDB() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, "{}", "utf-8");
    }
}

/**
 * Read the entire database
 */
function readDB() {
    ensureDB();
    try {
        const raw = fs.readFileSync(DB_PATH, "utf-8");
        return JSON.parse(raw);
    } catch (err) {
        return {};
    }
}

/**
 * Write the entire database
 */
function writeDB(data) {
    ensureDB();
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Get guild settings from the database
 */
function getGuildSettings(guildId) {
    const db = readDB();
    if (!db[guildId]) {
        db[guildId] = {};
        writeDB(db);
    }
    return db[guildId];
}

/**
 * Save a specific guild setting
 */
function setGuildSetting(guildId, key, value) {
    const db = readDB();
    if (!db[guildId]) db[guildId] = {};
    db[guildId][key] = value;
    writeDB(db);
}

/**
 * Delete a specific guild setting
 */
function deleteGuildSetting(guildId, key) {
    const db = readDB();
    if (db[guildId]) {
        delete db[guildId][key];
        writeDB(db);
    }
}

module.exports = {
    getGuildSettings,
    setGuildSetting,
    deleteGuildSetting,
    readDB,
    writeDB,
};
