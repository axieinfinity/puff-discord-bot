const Discord = require('discord.js');
const fs = require('fs');
const Web3 = require('web3');

const auctionAbi = require('./auction.abi');
const { botToken, infuraKey } = require('./auth.json');

const rpcUrl = 'https://mainnet.infura.io/' + infuraKey;

const client = new Discord.Client();
const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));

const auctionAddress = '0x436fb447a25d90965b6311e931682f7279d03226';
const auctionContract = new web3.eth.Contract(auctionAbi, auctionAddress);

// const serverId = '445782521578389516';
// const channelId = '445834123156914186';
const serverId = '410537146672349205';
const channelId = '450725351664910347';

let lastBlock;

try {
  const saved = require(`${process.cwd()}/saved.json`);
  lastBlock = saved.lastBlock;
} catch (err) {
  lastBlock = 5693319;
}

const etherscanTx = txHash => (
  'https://etherscan.io/tx/' + txHash
);

const etherscanAddress = address => (
  'https://etherscan.io/address/' + address
);

const ether = value => {
  const { toBN } = web3.utils;
  return (toBN(value).div(toBN(10).pow(toBN(16))).toNumber() / 100).toFixed(2).replace(/\.?0+$/, '') + ' ETH';
};

const fetchBlocks = async channel => {
  try {
    const latestBlock = (await web3.eth.getBlock('latest')).number - 6;

    for (let fromBlock = lastBlock + 1; fromBlock <= latestBlock; fromBlock += 500) {
      const toBlock = Math.min(fromBlock + 499, latestBlock);

      console.log(`From block ${fromBlock} to block ${toBlock}…`);

      const auctionEvents = (await auctionContract.getPastEvents('allEvents', { fromBlock, toBlock }))

      const allEvents = auctionEvents.sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) {
          return a.blockNumber - b.blockNumber;
        }

        if (a.transactionIndex !== b.transactionIndex) {
          return a.transactionIndex - b.transactionIndex;
        }

        return a.logIndex - b.logIndex;
      });

      let fromEvent = 0, toEvent;

      while (fromEvent < allEvents.length) {
        toEvent = fromEvent;

        while (
          toEvent < allEvents.length &&
            allEvents[toEvent].transactionHash == allEvents[fromEvent].transactionHash
        ) {
          toEvent++;
        }

        const events = allEvents.slice(fromEvent, toEvent);
        fromEvent = toEvent;

        events
          .filter(({ event }) => event === 'AuctionBidded')
          .forEach(({ returnValues, transactionHash }) => {
            let name;

            switch (returnValues._nftId) {
              case '4154': name = 'Durendal'; break;
              case '4155': name = 'Hauteclere'; break;
              case '4156': name = 'Almace'; break;
            }

            const image = `https://axieinfinity.com/${name.toLowerCase()}.png`;
            const bidder = returnValues._bidder;
            const bidValue = returnValues._value;

            const embed = new Discord.RichEmbed()
              .setTitle('Hooray! There is a new bid!')
              .setColor(0xf9c300)
              .setThumbnail(image)
              .addField('Axie', name)
              .addField('Value', ether(bidValue))
              // .addField('Bidder', `[${bidder}](${etherscanAddress(bidder)})`)
              // .setURL(etherscanTx(transactionHash))
              .setURL('https://axieinfinity.com/#agamogenesis-auction')
              .setTimestamp();

            channel.send({ embed });
          });
      }

      lastBlock = toBlock;

      await new Promise((resolve, reject) => {
        fs.writeFile(
          `./saved.json`,
          JSON.stringify({ lastBlock }, null, 2),
          'utf8',
          err => err ? reject(err) : resolve()
        );
      });
    }
  } catch (e) {
    console.error(e);
  }

  setTimeout(() => fetchBlocks(channel), 5000);
};

client.on('ready', () => {
  const server = client.guilds.get(serverId);
  const channel = server.channels.get(channelId);
  fetchBlocks(channel);
});

client.login(botToken);
