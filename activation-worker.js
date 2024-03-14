//https://chat.openai.com/c/0c81b76a-f434-4e4e-a6c6-262fe79f97ef
const Redis = require('ioredis');
// Configure Redis client
const redisUrl = 'default:bigredisbigresults23@redis-goodless.fanarena.com:6379'; // process.env.REDIS_URL || 'default:bigredisbigresults23@redis-goodless.fanarena.com:6379' //'0.0.0.0:6379';
const redis = new Redis(`redis://${redisUrl}`);

async function saveMatchedEPCs(eventId, EPCs, saleData) {
  try {
    for (const item of EPCs) {
      const EPC = item[1][1];

      if(!EPC) { //check we have an actual EPC
        const errorMessage = `'No EPC found in EPCs array ${EPCs}.`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }
      const key = `SALE:MATCHED:${eventId}:${EPC}`;
      const data = Object.entries(saleData).flat();

      // Save to Redis
      const result = await redis.hset(key, data);
      console.log(`Saved matched ${EPC} to Redis ${result}`);

      // TODO IMPORTANT Remove the UNMATCHED sale based on saleData
    }
    return true;
  } catch (error) {
    console.error('Failed to save EPC data to Redis:', error);
    throw error; // Rethrow or handle as needed
  }
}

async function matchSalesBetween(eventId, POSID, saleData) {
  try {
    //TODO IMPORTANT REPLACE
    const key = `UNMATCHED:1:1`;//`UNMATCHED:${eventId}:${POSID}`

    // ZRANGE UNMATCHED:1:1 (1710318191134 -inf BYSCORE REV LIMIT 0 1 WITHSCORES
    console.log(`ZRANGE ${key} (${saleData.soldAt} -inf BYSCORE REV LIMIT 0 1 WITHSCORES`)
    const result = await redis.zrange(key, `(${saleData.soldAt}`, '-inf', 'BYSCORE', 'REV', 'LIMIT', 0, 1);//, WITHSCORES);
    const prevSale = JSON.parse(result);

    if(!prevSale) {
      const errorMessage = `No prevSale yet for ${POSID}.`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }// TODO no last sale

    console.log("PREVSALE", prevSale);

    //EPC zoeken aan die mat
    const EPCs = await redis.xrange(`SCAN:FTIKortrijk:62b6db49-0c07-4e8a-ae92-000462b6db49`, prevSale.soldAt, saleData.soldAt);
    console.log("EPC MATCHED SCAN:FTIKortrijk:62b6db49-0c07-4e8a-ae92-000462b6db49`", prevSale.soldAt, saleData.soldAt, EPCs);

    const savedEPCs = await saveMatchedEPCs(eventId, EPCs, saleData);
    console.log(`All matched EPCs saved to Redis ${savedEPCs}`);

    if(savedEPCs) {
      await zremAsync(key, JSON.stringify(saleData));
      console.log(`Removed ${JSON.stringify(saleData)} from ${key}`)
    } else {
      const errorMessage = `Could not save EPCs ${EPCs}.`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    return savedEPCs;
  } catch (err) {
    console.error('Error fetching additional data from Redis:', err);
    throw err; // Rethrow if you want calling code to handle it
  }
}

async function processMessage(eventId, message) {
  try {
    console.log('Processing message:', JSON.stringify(message));
    
    // message.body.tags.sort((a, b) => new Date(a.first_seen) - new Date(b.first_seen));
    // const firstScan = new Date(message.body.tags[0].first_seen).getTime();
    // console.log(`First scan ${message.body.POSID} at ${firstScan}`)

    // const lastSync = await getLastSale(eventId, message.body.POSID, firstScan);
    // console.log("Last sync sales", lastSync);

    const result = await matchSalesBetween(eventId, message.applicationId, message.payloadSale);
    console.log("final result", result)
    return result

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