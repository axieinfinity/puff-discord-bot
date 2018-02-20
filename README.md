# Puff – The Discord bot of Axie Infinity

Currently Puff has only one feature: counting invites from Discord members.

The source code is dead simple and contains a lot of hard-coded values,
please modify it according to your own needs if you also want to use Puff
for your Discord server.

## Commands

```
!leaderboard, !top, !tops: Show invite leaderboard.
!invites: Show a user's invites.
!help: Display the help message.
```

## Usage

Create a file named `auth.json` in the root directory of the project
(at the same level with `index.js`) and put your bot token there:

```json
{
  "botToken": "put your bot token here"
}
```

Start the bot:

```sh
node .
```

## License

MIT licensed.
