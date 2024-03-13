//https://chat.openai.com/c/0c81b76a-f434-4e4e-a6c6-262fe79f97ef
const Redis = require('ioredis');
// Configure Redis client
const redisUrl = 'default:bigredisbigresults23@redis-goodless.fanarena.com:6379'; // process.env.REDIS_URL || 'default:bigredisbigresults23@redis-goodless.fanarena.com:6379' //'0.0.0.0:6379';
const redis = new Redis(`redis://${redisUrl}`);

async function getUnmatchedSalesBetween(eventId, POSID, score) {
  try {
    //TODO IMPORTANT REPLACE
    const key = `UNMATCHED:1:1`;//`UNMATCHED:${eventId}:${POSID}`

    // lastSale
    // const data = await redis.zrange(key, 0, 0, "REV"); // "WITHSCORES"
    // const lastSale = JSON.parse(data[0]).soldAt;

    const data = await redis.zrange(key, 0, -1);
    console.log(data)

    return JSON.parse(data);
  } catch (err) {
    console.error('Error fetching additional data from Redis:', err);
    throw err; // Rethrow if you want calling code to handle it
  }
}

//TODO SINCE SCAN
// async function getLastThreeSales(eventId, POSID, firstScan) {
//   try {
//     //TODO IMPORTANT REPLACE
//     const key = `UNMATCHED:1:1`;//`UNMATCHED:${eventId}:${POSID}`

//         // ZRANGE key start stop [BYSCORE | BYLEX] [REV] [LIMIT offset count]
//     // [WITHSCORES]

//     const data = await redis.zrange(key, '-inf', firstScan, "BYSCORE");// await redis.zrange(key, '-inf', firstScan, 'BYSCORE', 'LIMIT 0 3', 'WITHSCORES')
    
//     return JSON.parse(data); // Assuming the data is JSON-formatted
//   } catch (err) {
//     console.error('Error fetching additional data from Redis:', err);
//     throw err; // Rethrow if you want calling code to handle it
//   }
// }

async function processMessage(eventId, message) {
  try {
    console.log('Processing message:', JSON.stringify(message));
    
    // message.body.tags.sort((a, b) => new Date(a.first_seen) - new Date(b.first_seen));
    // const firstScan = new Date(message.body.tags[0].first_seen).getTime();
    // console.log(`First scan ${message.body.POSID} at ${firstScan}`)

    // const lastSync = await getLastSale(eventId, message.body.POSID, firstScan);
    // console.log("Last sync sales", lastSync);

    const unmatchedSale = await getUnmatchedSalesBetween(eventId, message.locationId, message.payloadSale.soldAt);
    console.log("Unmatched sale", unmatchedSale);

    if(false) {
      const errorMessage = `${epc.EPC}`;
      console.error(errorMessage);
    }

    //ZREM UNMATCHED:1:1 '{"soldAt":1710249180561,"transaction_id":51,"transaction_row_id":76,"quantity":6,"status":"pending","matched":0}'

    return true;

    // const lastThreeSales = await getLastThreeSales(eventId, message.body.POSID, firstScan);
    // console.log('getLastThreeSales:', lastThreeSales);

    // - EPC activation: Package:EventId:EPC → card/tx 
    // → EPC History: History:EPC → historical logs → "activation"
  } catch (error) {
    console.error('Error processing message:', error);
    return error;
  }
}

function waitForMessage(eventId) {
  redis.blpop(`SALE_QUEUE:${eventId}`, 0, async (err, [queue, messageString]) => {
    if (err) {
      console.error('Error popping message from Redis list', err);
      return;
    }

    if (messageString) {
      // Deserialize the message back into an object
      const message = JSON.parse(messageString);

      // Process the message (now an async operation)
      await processMessage(eventId, message);
    }

    // Wait for the next message, make sure to pass the eventId again
    waitForMessage(eventId);
  });
}

async function startWorker() {
  try {
    const args = process.argv.slice(2); // Skip the first two elements
    if (args.length < 1) {
      console.error('No arguments passed! Usage: node script.js <eventId>');
      process.exit(1);
    }
    const eventId = args[0];
    // TOOO fetch DATA from eventID
    const ENV_DATA = true;//await redis.get("ENV_DATA");
    if (ENV_DATA) {
      console.log(ENV_DATA);

      // Start waiting for messages
      console.log(`Started SALE_QUEUE:${eventId} worker...`);
      waitForMessage(eventId);
    } else {
      console.log('No ENV_DATA found.');
    }
  } catch (error) {
    console.error('Error initializing worker:', error);
  }
}

startWorker();