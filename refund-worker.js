//REFUND
// Refund Worker (Return)
// - Package:EventId:EPC → Refund tx via API
// 	→ EPC History: History:EPC → historical logs → "refund"

//https://api.weezevent.com/pay/v2/organizations/485376/transactions/actions
// {
//   "type": "CANCEL_TRANSACTION_PARTIALLY_REFUNDABLES",
//   "config": {
//     "transaction_rows": [
//       {
//         "id":  {transaction_row_id},
//         "quantity":  {quantity}
//       }
//     ],
//     "transaction_id":  {transaction_id}
//   }
// }

const https = require('https');
const querystring = require('querystring');

/*
 * GLOBAL ATTRIBUTES
 */
const tokenUrl = 'https://accounts.weezevent.com/oauth2/request/token';
const clientId = '0RhXkq6rCT8JTJ47u3ai5EH70MJqtdtDdi3rSfWE';
const clientSecret = '7HjARbI8YvXhVNZmXiIo8AvOxH9DHbayEupMKdpy';

const Redis = require('ioredis');
// Configure Redis client
const redisUrl = 'default:bigredisbigresults23@redis-goodless.fanarena.com:6379'; // process.env.REDIS_URL || 'default:bigredisbigresults23@redis-goodless.fanarena.com:6379' //'0.0.0.0:6379';
const redis = new Redis(`redis://${redisUrl}`);

// async function getEPC(eventId, POSID) {
//   try {
//     //TODO IMPORTANT REPLACE
//     const key = `UNMATCHED:1:1`;//`UNMATCHED:${eventId}:${POSID}`

//     // lastSale
//     // const data = await redis.zrange(key, 0, 0, "REV"); // "WITHSCORES"
//     // const lastSale = JSON.parse(data[0]).soldAt;

//     const data = await redis.zrange(key, 0, -1);
//     console.log(data)

//     return JSON.parse(data);
//   } catch (err) {
//     console.error('Error fetching additional data from Redis:', err);
//     throw err; // Rethrow if you want calling code to handle it
//   }
// }

/*
 * METHODS
 */
function getAccessToken() {
  return new Promise((resolve, reject) => {
    const authorization = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const headers = {
      'Authorization': `Basic ${authorization}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    const content = querystring.stringify({ grant_type: 'client_credentials' });

    const options = {
      method: 'POST',
      headers: headers
    };

    const req = https.request(tokenUrl, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const responseJson = JSON.parse(data);
          resolve(responseJson.access_token);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(content);
    req.end();
  });
}

/*
 * MAIN
 */
async function processMessage(eventId, message) {
  try {
    console.log('Processing message:', JSON.stringify(message));
    
    getAccessToken().then(accessToken => {
      console.log(`\nAccess Token: ${accessToken}\n`);
    }).catch(error => {
      console.error('Error getting access token:', error);
    });

    // const unmatchedSales = await getUnmatchedSales(eventId, message.body.POSID);
    // console.log("First unmatched sales", unmatchedSales);

    if(false) {
      const errorMessage = `${epc.EPC}`;
      console.error(errorMessage);
    }
    return true;

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