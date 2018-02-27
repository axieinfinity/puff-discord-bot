const fs = require('fs');
const Discord = require('discord.js');
const { botToken } = require('./auth.json');

const AXIE_INFINITY_SERVER_ID = '410537146672349205';

const SERVER_IDS = [
  '401808016887906304',
  // AXIE_INFINITY_SERVER_ID
];

const CHANNEL_NAMES = [
  'bot-interaction'
];

const EMBED_COLOR = 0x8d65ff;
const HELP_DESCRIPTION = [
  '**!leaderboard**, **!top**, **!tops**: Show invite leaderboard.',
  '**!invites**: Show your invites.',
  '**!help**: Display this help message.'
].join('\n');

const client = new Discord.Client({ sync: true });

const getOnlineMembers = () => {
  let aggregatedOnlineMembers;

  try {
    aggregatedOnlineMembers = require('./online-members.json');
  } catch (e) {
    aggregatedOnlineMembers = {};
  }

  const members = client.guilds
    .get(AXIE_INFINITY_SERVER_ID)
    .members;

  members.map(({ user }) => {
    if (typeof aggregatedOnlineMembers[user.id] === 'undefined') {
      aggregatedOnlineMembers[user.id] = {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        count: 0
      };
    }

    aggregatedOnlineMembers[user.id].count++;
  });

  fs.writeFile(
    './online-members.json',
    JSON.stringify(aggregatedOnlineMembers, null, 2),
    err => {
      if (err) {
        console.error(err);
      }
    }
  );

  setTimeout(getOnlineMembers, 30000);
};

client.on('ready', () => {
  console.log('I am ready!');
  getOnlineMembers();
});

const accept = (commands, handler) => {
  if (!Array.isArray(commands)) {
    commands = [ commands ];
  }

  client.on('message', message => {
    if (commands.indexOf(message.content) >= 0 &&
      SERVER_IDS.indexOf(message.channel.guild.id) >= 0 &&
      CHANNEL_NAMES.indexOf(message.channel.name) >= 0
    ) {
      handler(message);
    }
  });
}

const countInvites = message => (
  message.channel.guild
    .fetchInvites()
    .then(invites => {
      let invitesByUser = {};

      invites
        // Count permanent invite codes only.
        .filter(({ maxAge, uses }) => maxAge === 0 && uses > 0)
        // Too bad Discord.js's collections do not have `.forEach()`.
        .map(({ inviter, uses }, inviteCode) => {
          if (typeof invitesByUser[inviter.id] === 'undefined') {
            invitesByUser[inviter.id] = {
              id: inviter.id,
              username: inviter.username,
              numInvites: 0
            };
          }

          invitesByUser[inviter.id].numInvites += uses;
        });

      return invitesByUser;
    })
);

const formatNoun = (count, singular, plural) => (
  count > 1 ? plural : singular
);

const formatInvite = ({ username, numInvites }, index) => {
  const noun = formatNoun(numInvites, 'invite', 'invites');
  return `${index + 1} – **${username}**: *${numInvites} ${noun}*.`;
};

accept([ '!leaderboard', '!top', '!tops' ], message => {
  countInvites(message)
    .then(invitesByUser => {
      let leaderboard = [];

      for (let userId in invitesByUser) {
        if (invitesByUser.hasOwnProperty(userId)) {
          leaderboard.push([ userId, invitesByUser[userId] ]);
        }
      }

      loaderboard = leaderboard
        .sort((a, b) => b[1].numInvites - a[1].numInvites)
        .slice(0, 10);

      const description = leaderboard
        .map(([ _, invite ], index) => formatInvite(invite, index))
        .join('\n');

      return message.channel.send('Top inviters:', {
        embed: {
          color: EMBED_COLOR,
          description
        }
      });
    })
    .catch(err => {
      console.error(err);
    });
});

accept('!invites', message => {
  countInvites(message)
    .then(invitesByUser => {
      const invite = invitesByUser[message.author.id] || {};
      const numInvites = invite.numInvites || 0;
      const noun = formatNoun(numInvites, 'invite', 'invites');

      return message.channel.send(`<@${invite.id}> has ${numInvites} ${noun}.`);
    })
    .catch(err => {
      console.error(err);
    });
});

accept('!invite', message => {
  message.channel
    .send('Do you mean **!invites** (with an **s**)?')
    .catch(err => {
      console.error(err);
    });
});

accept('!help', message => {
  message.channel
    .send('Some commands:', {
      embed: {
        color: EMBED_COLOR,
        description: HELP_DESCRIPTION
      }
    })
    .catch(err => {
      console.error(err);
    });
});

client.login(botToken);
