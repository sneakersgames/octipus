const express = require('express');
var bodyParser = require('body-parser')
var app = express();
const port = process.env.PORT || 3000;
var jsonParser = bodyParser.json()

const Redis = require('ioredis');
// Configure Redis client
const redisUrl = process.env.REDIS_URL || 'default:bigredisbigresults23@0.0.0.0:6379';
//'default:bigredisbigresults23@redis-goodless.fanarena.com:6379';
const redis = new Redis(`redis://${redisUrl}`);

app.post('/webhooks/:eventName', jsonParser, async (request, res) => {
  try {
    //TODO validate auth header
    console.log(`New Webhook ${request.params.eventName} \n ----`)
    // console.log('headers', JSON.stringify(request.headers));
    console.log('body', JSON.stringify(request.body))

    const data = request.body;

    await redis.xadd(
      `WEBHOOKLOG:${request.params.eventName}`, 
      data.values.application.id, //`${Date.now()}`, 
      'req',
      JSON.stringify(request.body)
    );

    //TODO IMPORTANT should we handle updates?
    const skipWebhookUpdates = true;
    if(skipWebhookUpdates && request.body.method === 'update') {
      res.send({ status: 'SUCCESS', message: `Skipping update request due to closed loop` });
    } else {
      //TODO VALIDATE are event.id and application.id known?
      //POS_EVENT_ID = data.values.event.id?
      // const ENV_DATA = await redis.get("ENV_DATA");
      // if(!ENV_DATA) {
      //   const errorMessage = `No ENV DATA of POS not known. Update env_data.js to set ENV!`;
      //   console.error(errorMessage);
      //   throw new Error(errorMessage);
      // }

      //TODO VALIDATE catch if it returns more than one row
      // data.values.rows.forEach(row => { })
      const row = data.values.rows[0];
      //TODO VALIDATE QUANTITY IS BIGGER THAN 0?

      const score = new Date(data.values.validated).getTime()
      const payloadSale = {
        soldAt: score,//milliseconds
        transaction_id: data.id,
        transaction_row_id: row.id,
        quantity: row.payments[0].quantity,
        status: 'pending',
        matched: 0
      }

      //USED TO MATCH CUPS
      const zadd = await redis.zadd(`UNMATCHED:${data.values.event.id}:${data.values.application.id}`, score, JSON.stringify(payloadSale));

      //SALE:UNMATCHED:EVENT:POS:TRANSACTIONID used for refunding all cups
      const hset = await redis.hset(`SALE:UNMATCHED:${data.values.event.id}:${data.values.application.id}:${payloadSale.transaction_id}`, payloadSale);
      //SALE:MATCHED:EVENT:1 used for refunding cup per cup

      const queuePush = await redis.rpush(`SALE_QUEUE:${data.values.event.id}`, JSON.stringify({applicationId: data.values.application.id, payloadSale}));
      console.log(`Redis queue pushed ${queuePush}`)

      res.send({ status: 'SUCCESS', message: `Data Z${zadd}, H${hset} saved to Redis` });
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.log('DATA:', JSON.stringify(request.body));
    res.status(500).send({ status: 'FAILURE', message: 'An error occurred', errors: [error.message] });
  }
});

app.post('/activate', jsonParser, async (request, res) => {
  let errorMessages = [];

  try {
    console.log('New SCAN \n ----')
    //TODO validate auth header
    // console.log('headers', JSON.stringify(request.headers));
    console.log('body', JSON.stringify(request.body))

    const ENV_DATA = await redis.get("ENV_DATA");
    if(!ENV_DATA) {
      const errorMessage = `No ENV DATA is set. Run node env_data.js to set ENV!`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    const POS_DATA = JSON.parse(ENV_DATA).scanners.find(data => data.POSID === request.body.POSID);
    const eventId = POS_DATA.eventId;

    const currentTime = Date.now();

    if(!POS_DATA) {
      const errorMessage = `POSID ${request.body.POSID} is not known.`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    } else if(POS_DATA.type) {

      await redis.xadd(
        `SCANLOG:${request.body.POSID}`, 
        `${currentTime}`, 
        'req',
        JSON.stringify(request.body)
      );

      const tags = Array.isArray(request.body.tags) ? request.body.tags : [request.body.tags];

      if(POS_DATA.type === 'scan') {    
        for (const [index, epc] of (tags || []).entries()) {
          try {  
            //TODO DYNAMIC EPC CODE 330
            if (!epc.EPC.startsWith('303') || !epc.EPC.startsWith('000')) {
              const errorMessage = `EPC does not start with 303 or 000. ${epc.EPC}`;
              console.error(errorMessage);
              errorMessages.push(errorMessage);
  
              continue;
            }
  
            const firstSeen = new Date(epc.first_seen);
            let score = firstSeen.getTime();
  
            //TEST IF CURRENTTIME IS BETTER?
            if (Math.abs(currentTime - score) / (1000 * 60) > 10) {
              
              // score = currentTime; //set score to current time which is more accurate
  
              const errorMessage = `POS ${request.body.POSID}: time is out of sync, ${epc.first_seen}.`;
              console.error(errorMessage);
              errorMessages.push(errorMessage);
            }
        
            if (Math.abs(currentTime - score) / (1000 * 60 * 60 * 24 * 365) > 1) {
              
              // score = currentTime; //set score to current time which is more accurate
  
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
  
            const hsetPACKAGE = await redis.hset(`PACKAGE:${eventId}:${epc.EPC}`, Object.entries(payloadEPC).flat());
  
            const xaddSCAN = await redis.xadd(
              `SCAN:${eventId}:${request.body.POSID}`, 
              `${score}-${index}`, 
              'EPC',
              epc.EPC
            );
  
            const xaddHISTORY =await redis.xadd(
              `HISTORY:${epc.EPC}`, 
              `${score}-${index}`, 
              'info',
              `${eventId} SALE at ${request.body.POSID} with ${epc.count} counts. UTC ${score}, First seen ${epc.first_seen}, Last seen ${epc.last_seen}.`
            );

            console.log(`${epc.EPC} SCANNED: ${hsetPACKAGE}, ${xaddSCAN}, ${xaddHISTORY}`)
  
          } catch (innerError) {
            console.error('Error processing EPC:', innerError);
            errorMessages.push(innerError.message);
          }
        }
    
        if (errorMessages.length > 0) {
          res.send({ 
            status: 'PARTIAL_SUCCESS', 
            message: 'Some mat scan data saved to Redis, but there were errors.',
            errors: errorMessages 
          });
        } else {
          res.send({ status: 'SUCCESS', message: 'Sale scan data saved to Redis' });
        }
  
      } else if (POS_DATA.type === 'bin') {    
        for (const [index, epc] of (tags || []).entries()) {
          try {
            //TODO DYNAMIC EPC CODE 330
            if (!epc.EPC.startsWith('303') || !epc.EPC.startsWith('000')) {
              const errorMessage = `EPC does not start with 303 or 000. ${epc.EPC}`;
              console.error(errorMessage);
              errorMessages.push(errorMessage);
  
              continue;
            }
  
            const firstSeen = new Date(epc.first_seen);
            let score = firstSeen.getTime();
  
            //TEST IF CURRENTTIME IS BETTER?
            if (Math.abs(currentTime - score) / (1000 * 60) > 10) {
              
              // score = currentTime; //set score to current time which is more accurate
  
              const errorMessage = `BIN ${request.body.POSID}: time is out of sync, ${epc.first_seen}.`;
              console.error(errorMessage);
              errorMessages.push(errorMessage);
            }
        
            if (Math.abs(currentTime - score) / (1000 * 60 * 60 * 24 * 365) > 1) {
              
              // score = currentTime; //set score to current time which is more accurate
  
              const errorMessage = `BIN ${request.body.POSID}: time is wrong, ${epc.first_seen}`;
              console.error(errorMessage);
              errorMessages.push(errorMessage);
            }
  
            const payloadEPC = {
              BINID: request.body.POSID,
              eventId: eventId,
              return_first_seen: epc.first_seen,
              return_last_seen: epc.last_seen,
              return_count: epc.count,
              status: 'returned'
            }
  
            const hsetPACKAGE = await redis.hset(`PACKAGE:${eventId}:${epc.EPC}`, Object.entries(payloadEPC).flat());
  
            const xaddSCAN = await redis.xadd(
              `SCAN:${eventId}:${request.body.POSID}`,
              `${score}-${index}`, 
              // `${currentTime}-${index}`,
              'EPC',
              epc.EPC
            );
        
            const xaddHISTORY = await redis.xadd(
              `HISTORY:${epc.EPC}`, 
              `${score}-${index}`, 
              // `${currentTime}-${index}`,
              'info',
              `${eventId} RETURN at ${request.body.POSID} with ${epc.count} counts. UTC ${score}, First seen ${epc.first_seen}, Last seen ${epc.last_seen}.`
            );

            console.log(`RETURNED EPC ${epc.EPC} - ${hsetPACKAGE}, ${xaddSCAN}, ${xaddHISTORY}`);

            const refund = await redis.hgetall(`PACKAGE:${eventId}:${epc.EPC}`);
            
            //IMPORTANT
            if(!refund.soldAt || !refund.transaction_id || !refund.transaction_row_id) {
              console.log(`Returned unmatched CUP ${epc.EPC}`);
              await redis.rpush(`RETURNED_UNMATCHED:1`, JSON.stringify(epc));
            } else {
              //TODO REFUND_QUEUE eventId
              const refundString = JSON.stringify(Object.assign({}, refund, { EPC: epc.EPC}));
              const queuePush = await redis.rpush(`REFUND_QUEUE:1`, refundString);
              console.log(`Refund ${epc.EPC} queue pushed ${queuePush}`)
            }
  
          } catch (innerError) {
            console.error('Error processing EPC:', innerError);
            errorMessages.push(innerError.message);
          }
        }
    
        // Final response
        if (errorMessages.length > 0) {
          res.send({ 
            status: 'PARTIAL_SUCCESS', 
            message: 'Some bin return data saved to Redis, but there were errors.',
            errors: errorMessages 
          });
        } else {
          res.send({ status: 'SUCCESS', message: 'Bin return data saved to Redis' });
        }
      }
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
