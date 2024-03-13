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

//TODO Improve Redis save
// redis
// .multi()
// .set("foo", "bar")
// .get("foo")
// .exec((err, results) => {
//   // results === [[null, 'OK'], [null, 'bar']]
// });
//https://chat.openai.com/c/85148770-5e3c-4ec8-973a-e5e31d67fb69

//TODO check env_data.js script, either run it or throw error if no ENV_DATA key

app.post('/webhooks/:eventName', jsonParser, async (request, res) => {
  try {
    //TODO config weezevent
    //eventId and locationId should exist in our configuration
    const eventId = 'FTIKortrijk';  
    // const ENV_DATA = await redis.get("ENV_DATA");    
    // const POS_DATA = JSON.parse(ENV_DATA).find(data => data.POSID === request.body.POSID);
    // console.log('POS_DATA', POS_DATA);
    // const eventId = POS_DATA.eventId;

    //TODO validate auth header
    // console.log(`Webhook ${eventName} Request ${request.protocol}://${request.get('host')}${request.originalUrl} \n ----`)
    console.log(`Webhook originalUrl ${request.params.eventName} ${request.originalUrl}`)
    console.log('headers', JSON.stringify(request.headers));
    console.log('body', JSON.stringify(request.body))

    const data = request.body;

    //TODO catch if it returns more than one row
    // data.values.rows.forEach(row => { })
    const row = data.values.rows[0];

    //VALIDATE
    //POS_EVENT_ID = data.values.event.id?
    //QUANTITY IS BIGGER THAN 0?

    const key = `UNMATCHED:${data.values.event.id}:${data.values.location.id}`;
    const score = new Date(data.values.validated).getTime()
    const payloadSale = {
      soldAt: score,//milliseconds
      transaction_id: data.id,
      transaction_row_id: row.id,
      quantity: row.payments[0].quantity,
      status: 'pending',
      matched: 0
    }
    console.log(`New sale at ${payloadSale.soldAt} - ${data.values.validated}`);

    const zadd = await redis.zadd(key, score, JSON.stringify(payloadSale));
    //    console.log("ZADD", key, score, JSON.stringify(payloadSale));
    console.log(zadd)

    const hset = await redis.hset(`SALE:${key}:${payloadSale.transaction_id}`, payloadSale)//Object.entries(payloadEPC).flat());
    // console.log("HSET", `SALE:${key}:${payloadSale.transaction_id}`, payloadSale)
    console.log(hset);

    //TODO MESSAGE QUEUE
    const queuePush = await redis.rpush(`SALE_QUEUE:${eventId}`, JSON.stringify({locationId: data.values.location.id, payloadSale}));
    console.log('queue push:', queuePush)

    res.send({ status: 'SUCCESS', message: 'Data saved to Redis' });
  } catch (error) {
    console.error('Error:', error.message);
    console.log('DATA:', JSON.stringify(request.body));
    res.status(500).send({ status: 'FAILURE', message: 'An error occurred', errors: [error.message] });
  }
});

app.post('/activate', jsonParser, async (request, res) => {
  let errorMessages = [];

  try {
    console.log('New Request \n ----')
    //TODO validate auth header
    //TODO save request to logging
    console.log('headers', JSON.stringify(request.headers));
    console.log('body', JSON.stringify(request.body))

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
          errorMessages.push(innerError.message);
        }
      }
  
      // Final response
      if (errorMessages.length > 0) {
        res.send({ 
          status: 'PARTIAL_SUCCESS', 
          message: 'Some data saved to Redis, but there were errors.',
          errors: errorMessages 
        });
      } else {
        res.send({ status: 'SUCCESS', message: 'All data saved to Redis' });
      }

    } else if (POS_DATA.type === 'bin') {
      //todo return trigger
    } else {      
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
