const Redis = require('ioredis');
// Configure Redis client
const redisUrl = process.env.REDIS_URL || 'default:bigredisbigresults23@0.0.0.0:6379';
//'default:bigredisbigresults23@redis-goodless.fanarena.com:6379';
const redis = new Redis(`redis://${redisUrl}`);

const env_data = JSON.stringify({
  POS: {
    internalEventId: 'FTIKortrijk',
    externalEventId: '1',
    refundUrl: 'https://api.weezevent.com/pay/v2/organizations/456683/transactions/actions',
    //'https://api.weezevent.com/pay/v2/organizations/485376/transactions/actions'
  },
  scanners: [
    { 
      POSID: '9636b833-0c07-4e8a-ae92-00029636b833',
      name: 'TESTMAT MIRO',
      applicationId: 1,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
    { 
      POSID: '3dcfe05f-0c07-4e8a-ae92-00023dcfe05f',
      name: '8907 - bar 6.04',
      applicationId: 58,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
    { 
      POSID: '6f3dcb88-0c07-4e8a-ae92-00016f3dcb88',
      name: '8958 - bar 11.05',
      applicationId: 42,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
    { 
      POSID: 'ad60ebbc-0c07-4e8a-ae92-0002ad60ebbc',
      name: '8982 - bar 11.04',
      applicationId: 66,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
    { 
      POSID: '81e0a9dd-0c07-4e8a-ae92-000281e0a9dd',
      name: '8921 - bar 11.03',
      applicationId: 45,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
    { 
      POSID: 'b02689a4-0c07-4e8a-ae92-0002b02689a4',
      name: '8985 - bar 11.01',
      applicationId: 43,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
    { 
      POSID: '7da2dec2-0c07-4e8a-ae92-00037da2dec2',
      name: '8912 - bar 11 no label',
      applicationId: 59,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
    { 
      POSID: '18b24fb9-0c07-4e8a-ae92-000118b24fb9',
      name: '8970 - bar 10.01',
      applicationId: 53,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
    { 
      POSID: '339f1c7a-0c07-4e8a-ae92-0001339f1c7a',
      name: '8974 - bar 10.02',
      applicationId: 65,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
    { 
      POSID: '01d3b691-0c07-4e8a-ae92-000201d3b691',
      name: '8931 - bar 10.03',
      applicationId: 52,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
    { 
      POSID: 'bdb10c72-0c07-4e8a-ae92-0002bdb10c72',
      name: '8957 - bar 10.04',
      applicationId: 55,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
    { 
      POSID: '6e53541c-0c07-4e8a-ae92-00026e53541c',
      name: '8972 - bar 10.05',
      applicationId: 56,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
    { 
      POSID: '6effa1bf-0c07-4e8a-ae92-00006effa1bf',
      name: '8973 - bar 9.05',
      applicationId: 57,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
    { 
      POSID: 'fd91c18e-0c07-4e8a-ae92-0000fd91c18e',
      name: '8909 - bacardi bar',
      applicationId: 63,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
    { 
      POSID: '8f51533a-0c07-4e8a-ae92-00008f51533a',
      name: '8902 - tails cocktail bar',
      applicationId: 67,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
    {
      POSID: '67f9cdcc-0c07-4e8a-ae92-000267f9cdcc',
      name: '8914 - bar 11 bin 1',
      applicationId: 0,
      type: 'bin',
      eventId: 'FTIKortrijk'
    },
    {
      POSID: 'f8ded70b-0c07-4e8a-ae92-0003f8ded70b',
      name: '8910 - bar 11 bin 2',
      applicationId: 0,
      type: 'bin',
      eventId: 'FTIKortrijk'
    },
    {
      POSID: '0bef30c4-0c07-4e8a-ae92-00010bef30c4',
      name: '8911 - bar 10 bin 1',
      applicationId: 0,
      type: 'bin',
      eventId: 'FTIKortrijk'
    },
    {
      POSID: '62b6db49-0c07-4e8a-ae92-000462b6db49',
      name: '8919 - bar 10 bin 2',
      applicationId: 0,
      type: 'bin',
      eventId: 'FTIKortrijk'
    },
    {
      POSID: 'b30ea869-0c07-4e8a-ae92-0000b30ea869',
      name: '8917 - tails cocktain bin',
      applicationId: 0,
      type: 'bin',
      eventId: 'FTIKortrijk'
    },
    {
      POSID: 'f91cbd3c-0c07-4e8a-ae92-0002f91cbd3c',
      name: '8903 - bacardi bin',
      applicationId: 0,
      type: 'bin',
      eventId: 'FTIKortrijk'
    },
        { 
      POSID: 'b028d758-0c07-4e8a-ae92-0001b028d758',
      name: '8981 - BAR LINKS POS2',
      applicationId: 62,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
    { 
      POSID: 'f66f2dec-0c07-4e8a-ae92-0002f66f2dec',
      name: '8940 - BAR LINKS POS8',
      applicationId: 49,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
    { 
      POSID: '4418d496-0c07-4e8a-ae92-00024418d496',
      name: '8950 - BAR LINKS POS10',
      applicationId: 48,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
    { 
      POSID: 'f42993b5-0c07-4e8a-ae92-0001f42993b5',
      name: '8983 - BAR RECHTS POS1',
      applicationId: 61,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
      { 
      POSID: 'b3a25dca-0c07-4e8a-ae92-0001b3a25dca',
      name: '8932 - BAR RECHTS POS3',
      applicationId: 64,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
    { 
      POSID: '85cf7e30-0c07-4e8a-ae92-000285cf7e30',
      name: '8953 - BAR RECHTS POS8',
      applicationId: 47,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
    { 
      POSID: '85cf7e30-0c07-4e8a-ae92-000285cf7e30',
      name: '8927 - BAR RECHTS POS9',
      applicationId: 46,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
    { 
      POSID: '409de4f9-0c07-4e8a-ae92-0000409de4f9',
      name: '8936 - BAR RECHTS POS5',
      applicationId: 44,
      type: 'scan',
      eventId: 'FTIKortrijk'
    },
  ]
})

redis.set('ENV_DATA', env_data, (err) => {
  if (err) throw err;
  console.log('Environment variables saved to Redis');
  redis.quit();
});
