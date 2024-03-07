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

//TODO GET FROM ENV VARS
const eventId = "01";
const score = Date.now();

app.post('/webhooks/:eventId', jsonParser, async (request, res) => {
  //TODO config weezevent
  //eventId and locationId should exist in our configuration
  console.log(`Webhook ${eventId} Request ${request.protocol}://${request.get('host')}${request.originalUrl} \n ----`)
  //TODO validate auth header
  console.log('headers', request.headers);
  console.log('body', request.body);

  const data = request.body;

  //TODO catch if it returns more than one row
  // data.values.rows.forEach(row => { })
  const row = data.values.rows[0];
  const date = new Date(data.values.validated);

  const key = `Sale:${data.values.event.id}:${data.values.location.id}`;
  const value = {
    soldAt: date.getTime() / 1000,
    transaction_id: data.id,
    transaction_row_id: row.id,
    quantity: row.payments[0].quantity      
  }
  console.log(`New sale at ${data.values.validated}`);
  console.log(key, value);
  //TODO Redis save
  //TODO Change to stream to be able to read all scans for a POSID in a certain range 
  //   await redis.zadd(`SCAN:${eventId}:${epc.POSID}`, score, JSON.stringify(epc));
  //   await redis.hset(`PACKAGE:${eventId}:${epc.EPC}`, {
  //     EPC: epc.EPC,
  //     first_seen: epc.first_seen,
  //     last_seen: epc.last_seen,
  //     count: epc.count,
  //     POSID: epc.POSID,
  //     eventId: eventId,
  //     status: 'scanned'
  //   }); // JSON.stringify(data));
  //   // await redis.xadd(`SCAN:${eventId}:${data.POSID}`, '*', 'EPC', data.EPC, 'first_seen', data.first_seen, 'last_seen', data.last_seen, 'count', data.count);
  // TODO send amqp message to try to match last sales (EPC) of this POSID 

  res.send({ status: 'SUCCESS', message: 'Data saved to Redis' });
});

//REFUND
//https://api.weezevent.com/pay/v2/organizations/485376/transactions/actions
// {
//   "type": "CANCEL_TRANSACTION_PARTIALLY_REFUNDABLES",
//   "config": {
//     "rows": [
//       {
//         "id":  {transaction_row_id},
//         "quantity":  {quantity}
//       }
//     ],
//     "transaction_id":  {transaction_id}
//   }
// }

app.post('/activate', jsonParser, async (request, res) => {
  console.log('New Request \n ----')
    //TODO validate auth header
  console.log('headers', request.headers);
  console.log('body', request.body);
    
  const data = Array.isArray(request.body) ? request.body : [request.body];

  data.forEach(async (epc) => {
    //TODO Change to stream to be able to read all scans for a POSID in a certain range 
    await redis.zadd(`SCAN:${eventId}:${epc.POSID}`, score, JSON.stringify(epc));
    await redis.hset(`PACKAGE:${eventId}:${epc.EPC}`, {
      EPC: epc.EPC,
      first_seen: epc.first_seen,
      last_seen: epc.last_seen,
      count: epc.count,
      POSID: epc.POSID,
      eventId: eventId,
      status: 'scanned'
    }); // JSON.stringify(data));

    // await redis.xadd(`SCAN:${eventId}:${data.POSID}`, '*', 'EPC', data.EPC, 'first_seen', data.first_seen, 'last_seen', data.last_seen, 'count', data.count);

    // TODO send amqp message to try to match last sales (EPC) of this POSID 
  });

  res.send({ status: 'SUCCESS', message: 'Data saved to Redis' });
});

app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
});
