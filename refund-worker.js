const https = require('https');
const querystring = require('querystring');

/*
 * GLOBAL ATTRIBUTES
 */
const tokenUrl = 'https://accounts.weezevent.com/oauth2/request/token';
const clientId = '0RhXkq6rCT8JTJ47u3ai5EH70MJqtdtDdi3rSfWE';
const clientSecret = '7HjARbI8YvXhVNZmXiIo8AvOxH9DHbayEupMKdpy';
const testRefundUrl = 'https://api.weezevent.com/pay/v2/organizations/485376/transactions/actions';
const mockUrl = 'https://c0c7fa98e8934b2e92a70a3ae9542a7c.api.mockbin.io/';
const refundUrl = 'https://api.weezevent.com/pay/v2/organizations/456683/transactions/actions';

const Redis = require('ioredis');
// Configure Redis client
const redisUrl = process.env.REDIS_URL || 'default:bigredisbigresults23@0.0.0.0:6379';
//'default:bigredisbigresults23@redis-goodless.fanarena.com:6379';
const redis = new Redis(`redis://${redisUrl}`);

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

function sendRefund(accessToken, message) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    const body = JSON.stringify({
      "type": "CANCEL_TRANSACTION_PARTIALLY_REFUNDABLES",
      "config": {
        "transaction_rows": [
          {
            "id": message.transaction_row_id,
            // APPERANTLY WE CAN NOT CANCEL PARTIALLY REFUNDABLES PARTIALLY, WE NEED TO PASS THE FULL QUANTITY
            // THIS MIGHT RESULT IN MORE REFUNDED CUPS THAN INTENDED
            "quantity": message.quantity //quantity is always one since only scan one EPC
          }
        ],
        "transaction_id": message.transaction_id
      }
    });

    const options = {
      method: 'POST',
      headers: headers
    };

    const req = https.request(refundUrl, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const responseJson = JSON.parse(data);
          console.log("Refund response: ", responseJson);
          resolve(responseJson);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      console.log("Refund error log: ", e)
      reject(e);
    });

    req.write(body);
    req.end();
  });
}

/*
 * MAIN
 */
async function processMessage(message) {
  try {
    console.log('Refund worker processing message:', JSON.stringify(message));

    const accessToken = await getAccessToken();
    const refund = await sendRefund(accessToken, message);
    console.log(`Refund for ${message.EPC}, result ${JSON.stringify(refund)}`);

  } catch (error) {
    console.error('Error processing message:', error);
    return error;
  }
}

function waitForMessage() {
  //todo refundqueue:eventId
  redis.blpop(`REFUND_QUEUE:1`, 0, async (err, [queue, messageString]) => {
    if (err) {
      console.error('Error popping message from refund list...', err);
      return;
    }

    if (messageString) {
      //TODO validate messageString contents
      await processMessage(JSON.parse(messageString));
    } else {
      console.error('Refund message is empty', messageString, err);
    }

    // Wait for the next message
    waitForMessage();
  });
}

async function startWorker() {
  try {
    console.log(`Started REFUND QUEUE worker...`);
    waitForMessage();
  } catch (error) {
    console.error('Error initializing worker:', error);
  }
}

startWorker();