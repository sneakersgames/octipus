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

async function processPayments() {
    const conn = await amqp.connect(process.env.RABBITMQ_URL); // Connect to RabbitMQ server
    const channel = await conn.createChannel(); // Create a channel

    const exchange = 'payments'; // Replace with your exchange name
    const exchangeType = 'direct'; // Replace with the type of your exchange (direct, topic, fanout, headers)
    const routingKey = 'starnet.kaagent'; // Replace with your specific routing key

    // Declare the exchange
    await channel.assertExchange(exchange, exchangeType, { durable: true });

    // Declare a queue with a generated name
    const q = await channel.assertQueue('', { exclusive: true });

    channel.prefetch(1); // Only one message at a time

    // Bind the queue to the exchange with the routing key
    await channel.bindQueue(q.queue, exchange, routingKey);

    console.log(`Waiting for messages in ${q.queue}. To exit press CTRL+C`);

    //TODO CATCH ERRORS
    channel.consume(q.queue, async (msg) => {
      if (msg !== null) {
        const paymentInfo = JSON.parse(msg.content.toString());
        console.log("Received payment:", paymentInfo);

        // await redis.zadd(`SALE:${eventId}:${paymentInfo.GeraetID}`, score, JSON.stringify(paymentInfo));
        //stream or zadd for sorted set
        await redis.xadd(
          `SALE:${paymentInfo.EventID}:${paymentInfo.GeraetID}`, // TODO transform paymentInfo.GeraetID to POSID
          paymentInfo.TrxTimestamp, // TODO transform paymentInfo.TrxTimestamp to UNIX EPOCH
          'paymentInfo',
          JSON.stringify(paymentInfo)
        );

        // TODO add hash to redis
        await redis.hset(`TRX:${paymentInfo.EventID}:${paymentInfo.idPaymentTrx}`, Object.entries(paymentInfo).flat());

        //TODO add activation worker queue (activate-packages)

        channel.ack(msg); // Acknowledge the message
      }
    });
}

processPayments().catch(console.error);
