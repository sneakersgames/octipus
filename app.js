require('dotenv').config();
const moment = require('moment');
const express = require('express');
var bodyParser = require('body-parser')

const multer = require('multer');
const csvParser = require('csv-parser');
const axios = require('axios');

const amqp = require('amqplib');

async function sendToQueue(data, queue) {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createConfirmChannel();

  // Assert the queue exists
  await channel.assertQueue(queue, {
    durable: false
  });

  channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)));

  // Wait for the message to be confirmed as queued
  await channel.waitForConfirms();

  console.log(" [x] Sent data to 'scans' queue");

  await channel.close();
  await connection.close();
}

var app = express();
var jsonParser = bodyParser.json()
const port = process.env.PORT || 3000;

const Redis = require('ioredis');
// Configure Redis client
const redis = new Redis({
  reconnectOnError(err) {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      // Only reconnect when the error contains "READONLY"
      return true; // or `return 1;`
    }
  },
}, process.env.REDIS_URL || '0.0.0.0:6379');

const octopusURL = process.env.OCTOPUS_URL || 'https://batch.free.beeceptor.com';
const octopusToken = process.env.OCTOPUS_TOKEN || '';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 1024 * 1024 * 50 }});
const Readable = require('stream').Readable;

app.post('/activate', jsonParser, async (request, res) => {
  //TODO validate auth header
  console.log(request.body);
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

/* Request body
{
  "EPC": [
    {
      "tag": "1234567890",
      "first_seen": 1632254400000,
      "last_seen": 1632254400000,
      "count": 1
    }
  ],
  "POSID": "1234567890",
  "last_sync": 1632254400000
}
*/
app.post('/scan', jsonParser, async (request, res) => {
  //TODO validate Auth header
  //TODO dynamic eventId
  const eventId = "01";
  //We use EPC first seen scanning as score, unless there is a delay in the scanners clock of more than 1 day from our clock
  const epoch = Date.now();

  try {
    request.body.EPC.forEach(async (EPC, index) => {
      const data = {
        EPC: EPC.tag,
        first_seen: moment(EPC.first_seen).valueOf(),
        last_seen: EPC.last_seen,
        count: EPC.count,
        POSID: request.body.POSID,
        eventId: eventId,
        last_sync: request.body.last_sync,
        status: 'scanned'
      }
      await redis.hset(`PACKAGE:${eventId}:${data.EPC}`, Object.entries(data).flat());
      //stream or zadd for sorted set
      await redis.xadd(
        `POS:${eventId}:${data.POSID}`, 
        //(data.first_seen+86.400) < epoch ? epoch : //epoch check TODO throw WARNING if epoch is used
        `${data.first_seen.toString()}-${index}`, 
        'EPC',
        data.EPC
      );

      await sendToQueue(data, 'process-scans');
    });

    res.send({ status: 'SUCCESS', message: 'Scan saved' });
  } catch (error) {
    console.error('Redis error:', error);

    res.status(500).send({ status: 'ERROR', message: 'Failed to save scan' });
  }
});

/* Request body
{
  "EPC": [
    {
      "tag": "1234567890",
      "first_seen": 1632254400000,
      "last_seen": 1632254400000,
      "count": 1
    }
  ],
  "POSID": "1234567890",
  "last_sync": 1632254400000
}
*/
app.post('/return', jsonParser, async (request, res) => {
  //TODO validate Auth header
  //TODO dynamic eventId
  const eventId = "01";
  //We use EPC first seen scanning as score, unless there is a delay in the scanners clock of more than 1 day from our clock
  const epoch = Date.now();

  try {
    request.body.EPC.forEach(async EPC => {
      const data = {
        EPC: EPC.tag,
        first_seen: EPC.first_seen,
        last_seen: EPC.last_seen,
        count: EPC.count,
        POSID: request.body.POSID,
        eventId: eventId,
        last_sync: request.body.last_sync,
        status: 'returned'
      }

      //stream or zadd for sorted set
      await redis.xadd(
        `BIN:${eventId}:${data.POSID}`, 
        //(data.first_seen+86.400) < epoch ? epoch : //epoch check TODO throw WARNING if epoch is used
        `${data.first_seen.toString()}-${index}`, 
        'EPC',
        data.EPC
      );

      //TODO RabbitMQ send data to return queue -> await redis.hset(`PACKAGE:${eventId}:${data.EPC}`, Object.entries(data).flat());
      await sendToQueue(data, 'process-returns');
    });

    res.send({ status: 'SUCCESS', message: 'Return saved' });
  } catch (error) {
    console.error('Redis error:', error);

    res.status(500).send({ status: 'ERROR', message: 'Failed to save scan' });
  }
});

app.post('/upload', upload.single('file'), (req, res) => {
  // console.log(req.body);
  // console.log(req.file);

  if (!req.file) {
      return res.status(400).send('No file uploaded.');
  }

  const buffer = req.file.buffer;
  const tags = [];
  let isDataSection = false;

  // Convert buffer to readable stream
  const readableStream = new Readable({
      read() {
          this.push(buffer);
          this.push(null);
      }
  });

  readableStream
      .pipe(csvParser())
      .on('data', (row) => {
          if (row['INVENTORY SUMMARY'] === 'TAG ID') {
              isDataSection = true;
              return; // skip this header row
          }
          
          if (isDataSection && row['INVENTORY SUMMARY']) {
              tags.push(row['INVENTORY SUMMARY']);
          }
      })
      .on('end', () => {
          console.log('CSV file successfully processed.')
          console.log(tags);
          const packages = tags.map(tag => {
              return {
                  EPC: tag,
                  returntime: Date.now(),
                  status: 'accepted'
              };
          });

          const data = {
              packages: packages,
              SID: '2f2a96ce-6118-11ee-8c99-0242ac120002',
              type: 'event',
              time: Date.now()
          };

          axios.post(octopusURL, data, {headers: {'Authorization': `Bearer ${octopusToken}`}})
              .then(apiResponse => {
                  console.log(apiResponse.data)
                  res.send(`Data sent successfully. ${data.packages.length} EPC packages sent.`);
              })
              .catch(error => {
                  console.log(error);
                  res.status(500).send('Error in API call.');
              });
      });
});

app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
});
