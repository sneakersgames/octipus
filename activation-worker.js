//https://chat.openai.com/c/0c81b76a-f434-4e4e-a6c6-262fe79f97ef
const Redis = require('ioredis');
// Configure Redis client
const redisUrl = process.env.REDIS_URL || 'default:bigredisbigresults23@0.0.0.0:6379';
//'default:bigredisbigresults23@redis-goodless.fanarena.com:6379';
const redis = new Redis(`redis://${redisUrl}`);


// //USED TO MATCH CUPS
// const zadd = await redis.zadd(`UNMATCHED:${data.values.event.id}:${data.values.application.id}`, score, JSON.stringify(payloadSale));
      // TODO IMPORTANT Remove the UNMATCHED sale based on saleData

// //SALE:UNMATCHED:EVENT:POS:TRANSACTIONID used for refunding all cups
// const hset = await redis.hset(`SALE:UNMATCHED:${data.values.event.id}:${data.values.application.id}:${payloadSale.transaction_id}`, payloadSale);
// //SALE:MATCHED:EVENT:1 used for refunding cup per cup


async function saveMatchedEPCs(internalEventId, externalEventId, POSID, EPCs, saleData) {
  try {
    for (const item of EPCs) {
      const EPC = item[1][1];

      if(!EPC) {
        const errorMessage = `'No EPC found in EPCs array ${EPCs}.`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }
      const data = Object.entries(saleData).flat();

      const package = await redis.hset(`PACKAGE:${internalEventId}:${EPC}`, data);
      const result = await redis.hset(`SALE:MATCHED:${externalEventId}:${POSID}:${saleData.transaction_id}:${EPC}`, data);
      console.log(`HISTORY:${EPC}`, `${Date.now()}`, 'info',`MATCH to transaction ${saleData.transaction_id} at POS ${POSID}. Sold at ${saleData.soldAt}`)
      const history = await redis.xadd(
        `HISTORY:${EPC}`, 
        `${Date.now()}`,
        'info',
        `MATCH to transaction ${saleData.transaction_id} at POS ${POSID}. Sold at ${saleData.soldAt}`
      );
      console.log(`Saved matched ${EPC} to Redis ${package} ${result} ${history}`);
    }

    return true;
  } catch (error) {
    console.error('ERROR. Failed to save MATCHED EPC data to Redis:', error);
    throw error;
  }
}

async function matchSalesBetween(ENV_DATA, POSID, saleData) {
  try {
    const externalEventId = ENV_DATA.POS.externalEventId;
    const internalEventId = ENV_DATA.POS.internalEventId;

    const key = `UNMATCHED:${externalEventId}:${POSID}`

    const scannerId = ENV_DATA.scanners.find(data => data.type === 'scan' && data.applicationId === POSID).POSID;
    if(!scannerId) {
      const errorMessage = `ERROR. POS ${POSID} has no mat configured in ENV.`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    //Search Redis sales (UNMATCHED) for previous transaction timestamp
    const result = await redis.zrange(key, `(${saleData.soldAt}`, '-inf', 'BYSCORE', 'REV', 'LIMIT', 0, 1);//, WITHSCORES);
    if(!result || result.length === 0) {
      console.log(`No prevSale yet for ${POSID}.`);
      return null;
    } else {
      const prevSale = JSON.parse(result);

      //SCAN EPCs zoeken aan die mat
      const EPCs = await redis.xrange(`SCAN:${internalEventId}:${scannerId}`, prevSale.soldAt, saleData.soldAt);
      console.log(`SUCCES! MATCHED SCAN:${internalEventId}:${scannerId}`, prevSale.soldAt, saleData.soldAt, EPCs);
  
      const savedEPCs = await saveMatchedEPCs(internalEventId, externalEventId, POSID, EPCs, saleData);
  
      if(savedEPCs) {
        await redis.zrem(key, JSON.stringify(saleData));
        console.log(`Removed ${JSON.stringify(saleData)} from ${key}`)
      } else {
        const errorMessage = `Could not save EPCs ${EPCs}.`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }
  
      return savedEPCs;
    }
  } catch (err) {
    console.error('Error fetching additional data from Redis:', err);
    throw err; // Rethrow if you want calling code to handle it
  }
}

async function processMessage(ENV_DATA, message) {
  try {
    // console.log('Processing message:', JSON.stringify(message));

    const result = await matchSalesBetween(ENV_DATA, message.applicationId, message.payloadSale);
    // console.log("final result", result)
    return result

  } catch (error) {
    console.error('Error processing message:', error);
    return error;
  }
}

function waitForMessage(ENV_DATA) {
  redis.blpop(`SALE_QUEUE:${ENV_DATA.POS.externalEventId}`, 0, async (err, [queue, messageString]) => {
    if (err) {
      console.error('Error popping message from Redis list', err);
      return;
    }

    if (messageString) {
      const message = JSON.parse(messageString);

      await processMessage(ENV_DATA, message);
    }

    //TODO IMPORTANT SET TIMER FOR 10 sec?

    waitForMessage(ENV_DATA);
  });
}

async function startWorker() {
  try {
    // const args = process.argv.slice(2); // Skip the first two elements
    // if (args.length < 1) {
    //   console.error('No arguments passed! Usage: node activation-worker.js <externalEventId>');
    //   process.exit(1);
    // }
    // const externalEventId = args[0];
    
    const ENV_DATA = await redis.get("ENV_DATA");
    if(!ENV_DATA) {
      const errorMessage = `No ENV DATA is set. Run node env_data.js to set ENV!`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    if (ENV_DATA) {
      // const internalEventId = JSON.parse(ENV_DATA).POS.internalEventId;
      // const externalEventId = JSON.parse(ENV_DATA).POS.externalEventId;
      
      console.log(`Started SALE_QUEUE worker... ENV_DATA ${ENV_DATA}`);
      waitForMessage(JSON.parse(ENV_DATA));
    } else {
      console.log('No ENV_DATA found.');
    }
  } catch (error) {
    console.error('Error initializing worker:', error);
  }
}

startWorker();