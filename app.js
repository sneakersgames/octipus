const express = require('express');
var bodyParser = require('body-parser')
var app = express();
const port = process.env.PORT || 3000;
var jsonParser = bodyParser.json()

const Redis = require('ioredis');
// Configure Redis client
const redisUrl = process.env.REDIS_URL || '0.0.0.0:6379';
//default:bigredisbigresults23@redistack.fanarena.com:6379
const redis = new Redis(`redis://${redisUrl}`);

app.post('/activate', jsonParser, async (request, res) => {
  //TODO validate auth header
  console.log('New Request \n ----')
  console.log('headers', request.headers);
  console.log('body', request.body);
  const eventId = "01";
  const score = Date.now();

  //TODO check if array of EPC's and insert multiple EPC one by one
  const data = request.body;

  //TODO Change to stream to be able to read all scans for a POSID in a certain range 
  await redis.zadd(`SCAN:${eventId}:${data.POSID}`, score, JSON.stringify(data));

  await redis.hset(`PACKAGE:${eventId}:${data.EPC}`, {
      EPC: data.EPC,
      first_seen: data.first_seen,
      last_seen: data.last_seen,
      count: data.count,
      POSID: data.POSID,
      eventId: eventId,
      status: 'scanned'
  }); // JSON.stringify(data));

  // await redis.xadd(`SCAN:${eventId}:${data.POSID}`, '*', 'EPC', data.EPC, 'first_seen', data.first_seen, 'last_seen', data.last_seen, 'count', data.count);

  res.send({ status: 'SUCCESS', message: 'Data saved to Redis' });
});

app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
});
