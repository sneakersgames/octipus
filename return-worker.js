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

async function issueStarNetRefund(cardId, amount, reference) {
  const response = await axios.post(`${process.env.STAR_NET_URL}/cards/${cardId}/topup`,
      {

        'amount': amount,
        'reference': 'Octipus refund topup for transaction: ' + reference,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': process.env.STAR_NET_SECRET,
        },
      })
      .catch((error) => {
        console.log('#### TX FAILED: \n', error, '\n####');
        throw error;
      });
    return response.status === 204;
}

async function processReturn() {
  // Connect to RabbitMQ server
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createChannel();

  // Assert the queue exists
  await channel.assertQueue('process-returns');

  // Consume messages from the queue
  channel.consume('process-returns', async (msg) => {
    if (msg !== null) {
      // Parse the message content
      const package = JSON.parse(msg.content.toString());

      package.status = 'refunded';
      package.refundedAt = new Date();

      console.log('package', package);

      //TODO package to transaction information
      // const topupSuccess = await issueStarNetRefund({
      //   cardId: transaction.cardId,
      //   amount: transaction.totalAmount,
      //   reference: transaction.id,
      // });

      // if (!topupSuccess) {
      //   console.log('#### REFUND FAILED: \n', error, '\n####');
      //   throw error;
      // }

      // await redis.hset(`PACKAGE:${eventId}:${data.EPC}`, Object.entries(data).flat());

      // Acknowledge the message
      channel.ack(msg);
    }
  });

}

processReturn().catch(console.error);
