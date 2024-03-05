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
