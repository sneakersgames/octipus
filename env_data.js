const Redis = require('ioredis');
// Configure Redis client
const redisUrl = 'default:bigredisbigresults23@redis-goodless.fanarena.com:6379'; // process.env.REDIS_URL || 'default:bigredisbigresults23@redis-goodless.fanarena.com:6379' //'0.0.0.0:6379';
const redis = new Redis(`redis://${redisUrl}`);

const env_data = JSON.stringify(
[
  {
    POSID: '62b6db49-0c07-4e8a-ae92-000462b6db49',
    type: 'scan',
    eventId: 'FTIKortrijk'
  },
  {
    POSID: 'f8ded70b-0c07-4e8a-ae92-0003f8ded70b',
    type: 'bin',
    eventId: 'FTIKortrijk'
  },
])

redis.set('ENV_DATA', env_data, (err) => {
  if (err) throw err;
  console.log('Environment variables saved to Redis');
  redis.quit();
});