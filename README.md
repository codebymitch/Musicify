# ![Musicify Cover](/.github/assets/M_Banner.png)

[![Support Server](https://img.shields.io/badge/-Support%20Server-%235865F2?logo=discord&logoColor=white&style=flat-square&logoWidth=20)](https://discord.gg/MRjEUhDCpZ)
[![Invite Musicify](https://img.shields.io/badge/-Invite%20Musicify-111110?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTIgMTZjNC04IDQgMiAxMCAwczQtMTAgMTAtNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkFDQzE1IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==&logoColor=white&style=flat-square&logoWidth=20)](OAuth invite link)

## Musicify

Musicify is a ChatPlay-focused Discord music bot that also operates like a standard music bot. It is easy to self-host with Docker, or [click here to invite the bot](OAuth invite link) and start using it today with no hosting or setup required.

## Features & Commands

- ChatPlay-powered interactions for conversational bot control
- Standard music playback with multi-guild Lavalink support
- Supports queue management, shuffle, seek, volume, loop, and now playing
- Built-in commands for help, bot stats, and track information

## Docker Deployment (Recommended)

This repository includes Docker support for simple deployment.

1. Copy `.env.example` to `.env` and fill in your `BOT_TOKEN` and `CLIENT_ID`.
2. Start the bot:
   ```bash
   docker compose up --build -d
   ```
3. Stop the bot:
   ```bash
   docker compose down
   ```

If startup fails, use:
```bash
docker compose logs -f musicify
```

## Manual Installation Steps

### Prerequisites

- Node.js 18 or newer
- A Lavalink server (required by `config.js`)
- Discord bot application with proper intents and `BOT_TOKEN`/`CLIENT_ID`

1. Clone the repository:
   ```bash
   git clone https://github.com/codebymitch/Musicify.git
   cd Musicify
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your `BOT_TOKEN` and `CLIENT_ID`.
4. Configure `config.js` with your Lavalink server details.
   - Update `host`, `port`, `password`, and `secure` in `src/config.js`.
   - Ensure your Lavalink server is running and reachable.
5. Start the bot:
   ```bash
   npm start
   ```

## Documentation

- [Trademarks](TRADEMARKS.md)
- [Terms of Service](TermsOfService.md)
- [Privacy Policy](PrivacyPolicy.md)

Open an issue or drop into the support server for help.

## License

Musicify is released under the Apache License. See [LICENSE](LICENSE) for details.

## Thank You

Thank you for choosing Musicify for your Discord server! We're constantly working to improve and add new features based on community feedback.

*Last updated: May 2026*
