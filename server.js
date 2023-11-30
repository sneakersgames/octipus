// // POST /activate route
// fastify.post('/activate', async (request, reply) => {
//     //TODO validate auth header
//     console.log(request.body);
//     const eventId = "01";
//     const score = Date.now();

//     //TODO check if array of EPC's and insert multiple EPC one by one
//     const data = request.body;

//     //TODO Change to stream to be able to read all scans for a POSID in a certain range 
//     await redis.zadd(`SCAN:${eventId}:${data.POSID}`, score, JSON.stringify(data));

//     await redis.hset(`PACKAGE:${eventId}:${data.EPC}`, {
//         EPC: data.EPC,
//         first_seen: data.first_seen,
//         last_seen: data.last_seen,
//         count: data.count,
//         POSID: data.POSID,
//         eventId: eventId,
//         status: 'scanned'
//     }); // JSON.stringify(data));

//     // await redis.xadd(`SCAN:${eventId}:${data.POSID}`, '*', 'EPC', data.EPC, 'first_seen', data.first_seen, 'last_seen', data.last_seen, 'count', data.count);

//     return { status: 'success', message: 'Data saved to Redis' };
// });

// // POST /return route
// fastify.post('/return', async (request, reply) => {
//     const { key } = request.body;
//     const data = await redis.hgetall(key);

//     //TODO logica voor teruggave
//     return { status: 'success', message: data };
// });

const fastify = require('fastify')({ logger: true })
const Redis = require('ioredis');

// Configure Redis client
const redisUrl = process.env.REDIS_URL || '0.0.0.0:6379';
const port = process.env.PORT || 3000;
//default:bigredisbigresults23@redistack.fanarena.com:6379
const redis = new Redis(`redis://${redisUrl}`);

fastify.route({
  method: 'GET',
  url: '/',
  schema: {
    // request needs to have a querystring with a `name` parameter
    querystring: {
      type: 'object',
      properties: {
          name: { type: 'string'}
      },
      required: [],
    },
    // the response needs to be an object with an `hello` property of type 'string'
    response: {
      200: {
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      }
    }
  },
  // this function is executed for every request before the handler is executed
  preHandler: (request, reply, done) => {
    // E.g. check authentication
    done()
  },
  handler: (request, reply) => {
    reply.send({ hello: 'world' })
  }
})

fastify.listen({ port: port }, (err) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})

