const express = require('express');
var bodyParser = require('body-parser')
var app = express();
const port = process.env.PORT || 3000;
var jsonParser = bodyParser.json()

const Redis = require('ioredis');
// Configure Redis client
const redisUrl = process.env.REDIS_URL || 'default:bigredisbigresults23@redis-goodless.fanarena.com:6379' //'0.0.0.0:6379';
//default:bigredisbigresults23@redistack.fanarena.com:6379
const redis = new Redis(`redis://${redisUrl}`);

//TODO check env_data.js script, either run it or throw error if no ENV_DATA key

app.post('/webhooks/:eventName', jsonParser, async (request, res) => {
  //TODO config weezevent
  //eventId and locationId should exist in our configuration
    // const ENV_DATA = await redis.get("ENV_DATA");    
  // const POS_DATA = JSON.parse(ENV_DATA).find(data => data.POSID === request.body.POSID);
  // console.log('POS_DATA', POS_DATA);
  // const eventId = POS_DATA.eventId;

  const eventName = 'FTIKortrijk';  

  console.log(`Webhook ${eventName} Request ${request.protocol}://${request.get('host')}${request.originalUrl} \n ----`)
  //TODO validate auth header
  //TODO save request to logging
  console.log('headers', request.headers);
  console.log('body', request.body);

  console.log(JSON.stringify(request.body))

  const data = request.body;

  //TODO catch if it returns more than one row
  // data.values.rows.forEach(row => { })
  const row = data.values.rows[0];
  const date = new Date(data.values.validated);

  //VALIDATE
  //POS_EVENT_ID = data.values.event.id?
  //QUANTITY IS BIGGER THAN 0?

  const key = `SALE:${data.values.event.id}:${data.values.location.id}`;
  const value = {
    soldAt: date.getTime(),//milliseconds
    transaction_id: data.id,
    transaction_row_id: row.id,
    quantity: row.payments[0].quantity      
  }
  console.log(`New sale at ${data.values.validated}`);
  console.log(key, value);

  //TODO Redis save
  // redis
  // .multi()
  // .set("foo", "bar")
  // .get("foo")
  // .exec((err, results) => {
  //   // results === [[null, 'OK'], [null, 'bar']]
  // });
  //https://chat.openai.com/c/85148770-5e3c-4ec8-973a-e5e31d67fb69

  await redis.zadd(key, data.values.validated, JSON.stringify(value));

  await redis.hset(`MATCHED:${key}:${value.transaction_id}`, 'quantity', value.qauantity, 'status', 'pending', 'matched', 0);

  res.send({ status: 'SUCCESS', message: 'Data saved to Redis' });
});

app.post('/activate', jsonParser, async (request, res) => {
  let errorMessages = [];

  try {
    console.log('New Request \n ----')
    //TODO validate auth header
    //TODO save request to logging
    console.log('headers', request.headers);
    console.log('body', request.body);

    const ENV_DATA = await redis.get("ENV_DATA");    
    const POS_DATA = JSON.parse(ENV_DATA).find(data => data.POSID === request.body.POSID);
    console.log('POS_DATA', POS_DATA);
    const eventId = POS_DATA.eventId;

    const currentTime = Date.now();

    if(!POS_DATA) {
      const errorMessage = `POSID ${request.body.POSID} is not known.`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    } else if(POS_DATA.type === 'scan') {
      const tags = Array.isArray(request.body.tags) ? request.body.tags : [request.body.tags];

      for (const [index, epc] of (tags || []).entries()) {
        try {

          if (!epc.EPC.startsWith('330')) {
            const errorMessage = `EPC does not start with 330. ${epc.EPC}`;
            console.error(errorMessage);
            errorMessages.push(errorMessage);

            continue;
          }

          const firstSeen = new Date(epc.first_seen);
          let score = firstSeen.getTime();

          if (Math.abs(currentTime - score) / (1000 * 60) > 10) {
            
            score = currentTime; //set score to current time which is more accurate

            const errorMessage = `POS ${request.body.POSID}: time is out of sync, ${epc.first_seen}.`;
            console.error(errorMessage);
            errorMessages.push(errorMessage);
          }
      
          if (Math.abs(currentTime - score) / (1000 * 60 * 60 * 24 * 365) > 1) {
            
            score = currentTime; //set score to current time which is more accurate

            const errorMessage = `POS ${request.body.POSID}: time is wrong, ${epc.first_seen}`;
            console.error(errorMessage);
            errorMessages.push(errorMessage);
          }

          const payloadEPC = {
            POSID: request.body.POSID,
            eventId: eventId,
            first_seen: epc.first_seen,
            last_seen: epc.last_seen,
            count: epc.count,
            status: 'scanned'
          }

          //TODO catch redis insert errors
          await redis.hset(`PACKAGE:${eventId}:${epc.EPC}`, Object.entries(payloadEPC).flat());

          await redis.xadd(
            `SCAN:${eventId}:${request.body.POSID}`, 
            `${score}-${index}`, 
            'EPC',
            epc.EPC
            // Object.entries(payloadEPC).flat()
          );
          //stream xadd or zadd for sorted set
          //await redis.xadd(`SCAN:${eventId}:${request.body.POSID}}`, '*', 'EPC', epc.EPC, 'first_seen', epc.first_seen, 'last_seen', epc.last_seen, 'count', epc.count);
          //await redis.zadd(`SCAN:${eventId}:${request.body.POSID}`, `${score}-${index}`, JSON.stringify(epc));
      
          //TODO HISTORY
          await redis.xadd(
            `HISTORY:${epc.EPC}`, 
            `${score}-${index}`, 
            'info',
            `${eventId} SALE at ${request.body.POSID} with ${epc.count} counts. UTC ${score}, First seen ${epc.first_seen}, Last seen ${epc.last_seen}.`
            // Object.entries(payloadEPC).flat()
          );

        } catch (innerError) {
          console.error('Error processing EPC:', innerError);
          errorMessages.push(innerError.message); // Collect error message
        }
      }

      //TODO MESSAGE QUEUE
      const queuePush = await redis.rpush(`SALE_QUEUE:${eventId}`, JSON.stringify({POS_DATA, body: request.body}));
      console.log('queue push:', queuePush)
  
      // Final response
      if (errorMessages.length > 0) {
        // Respond with success but include error messages
        res.send({ 
          status: 'PARTIAL_SUCCESS', 
          message: 'Some data saved to Redis, but there were errors.',
          errors: errorMessages 
        });
      } else {
        // If there were no errors, respond with complete success
        res.send({ status: 'SUCCESS', message: 'All data saved to Redis' });
      }

    } else if (POS_DATA.type === 'bin') {
      //todo return trigger
    } else {
      //error queue
      
      const errorMessage = `${POS_DATA.type} type not known.`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.log('DATA:', request.body);
    res.status(500).send({ status: 'FAILURE', message: 'An error occurred', errors: [error.message] });
  }
});

app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
});
