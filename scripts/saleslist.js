const Redis = require('ioredis');
// Configure Redis client
const redisUrl = process.env.REDIS_URL || 'default:bigredisbigresults23@0.0.0.0:6379';
//'default:bigredisbigresults23@redis-goodless.fanarena.com:6379';
const redis = new Redis(`redis://${redisUrl}`);

const fs = require('fs');
const path = require('path');
const { exit } = require('process');

// Stream key
const streamKey = 'SALESLIST';

// CSV file path
const csvFilePath = path.join(__dirname, 'sales_ids.csv');

// Function to process the stream and save IDs to a CSV file
async function processStreamToCSV(streamKey, filePath) {
  let lastId = '0-0';
  const writeStream = fs.createWriteStream(filePath, { flags: 'a' });

  while (true) {
    const entries = await redis.xread('BLOCK', 1000, 'COUNT', 100, 'STREAMS', streamKey, lastId);
    if (!entries || entries.length === 0) {
      break; // No more entries to process
    }

    for (const [, messages] of entries) {
      for (const [messageId, message] of messages) {
        // Assuming the ID you want to save is the Redis stream ID
        // If it's inside the message, you'd parse the message and extract the desired ID
        writeStream.write(`${messageId},${JSON.parse(message[1]).id}\n`);
        
        // Update lastId to the latest one read
        lastId = messageId;
      }
    }
  }

  writeStream.end();
  writeStream.on('finish', () => {
    console.log('All IDs have been saved to CSV.');
    exit();
  });
}

// Execute the function
processStreamToCSV(streamKey, csvFilePath).catch(err => {
  console.error('An error occurred:', err);
});