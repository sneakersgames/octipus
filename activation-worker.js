require('dotenv').config();
const amqp = require('amqplib');

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

async function activatePackage() {
  // Connect to RabbitMQ server
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createChannel();

  // Assert the queue exists
  await channel.assertQueue('activate-packages');

  // Consume messages from the queue
  channel.consume('activate-packages', async (msg) => {
    if (msg !== null) {
      
      console.log(msg);

      //get the current sale transaction timestamp, this must be < than the package activation timestamp
      //get the previous sale transaction timestamp, this must be > than the package activation timestamp
      // if nothing is found?

      //XRANGE POS:01:1 - 1702494480001-0 COUNT number of packages needed

      // await redis.hset(`PACKAGE:${eventId}:${data.EPC}`, Object.entries(data).flat());

      // Acknowledge the message
      channel.ack(msg);
    }
  })

}

activatePackage().catch(console.error);
