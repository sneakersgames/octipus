const Redis = require('ioredis');
// Configure Redis client
const redisUrl = process.env.REDIS_URL || 'default:bigredisbigresults23@0.0.0.0:6379';
//'default:bigredisbigresults23@redis-goodless.fanarena.com:6379';
const redis = new Redis(`redis://${redisUrl}`);

// List of source streams
const sourceStreams = [
  'WEBHOOKLOG:weezevent:42',
  'WEBHOOKLOG:weezevent:43',
  'WEBHOOKLOG:weezevent:44',
  'WEBHOOKLOG:weezevent:45',
  'WEBHOOKLOG:weezevent:46',
  'WEBHOOKLOG:weezevent:48',
  'WEBHOOKLOG:weezevent:49',
  'WEBHOOKLOG:weezevent:52',
  'WEBHOOKLOG:weezevent:53',
  'WEBHOOKLOG:weezevent:55',
  'WEBHOOKLOG:weezevent:56',
  'WEBHOOKLOG:weezevent:57',
  'WEBHOOKLOG:weezevent:58',
  'WEBHOOKLOG:weezevent:59',
  'WEBHOOKLOG:weezevent:62',
  'WEBHOOKLOG:weezevent:63',
  'WEBHOOKLOG:weezevent:64',
  'WEBHOOKLOG:weezevent:65',
  'WEBHOOKLOG:weezevent:67'
]; // Add your stream keys here

// Target stream name
const targetStream = 'SALESLIST';

// Function to merge streams
async function mergeStreams(sources, target) {
  for (const source of sources) {
    let lastId = '0-0';
    while (true) {
      // Read 100 entries at a time from the current source stream
      const entries = await redis.xread('BLOCK', 1000, 'COUNT', 100, 'STREAMS', source, lastId);
      if (!entries || entries.length === 0) {
        // No more entries in the current source stream
        break;
      }

      for (const [, messages] of entries) {
        for (const [messageId, message] of messages) {
          // Flatten message for xadd
          const messageFlat = message.reduce((acc, val, idx, arr) => {
            if (idx % 2 === 0) acc[val] = arr[idx + 1];
            return acc;
          }, {});

          // Write each message to the target stream
          await redis.xadd(target, '*', ...Object.entries(messageFlat).flat());
          // Update lastId to the latest one read
          lastId = messageId;
        }
      }
    }
  }
}

// Execute the merge
mergeStreams(sourceStreams, targetStream).then(() => {
  console.log('Merge complete');
}).catch(err => {
  console.error('An error occurred:', err);
});
