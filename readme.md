//TODO
dubbel check event: 456683
closed loop, we skippen updates van webhook omdat deze anders data kan overschrijven na dat we matchen
eventId van webhook is 1 maar refund API stuur ik naar https://api.weezevent.com/pay/v2/organizations/456683/transactions/actions? (make internal and external eventId the same)
set digitalocean REDIS_URL = default:bigredisbigresults23@redis-goodless.fanarena.com:6379
node activation-worker.js FTIKortrijk
voor afsluiten kassa een lege transactie doen zodat we eindtijdstip krijgen

save request / redis data to external server S3?

Load testing
- POST /activate
- POST /webhook

* ENV_DATA
* HISTORY
 - stream (tijdstip) van EPC logs: waar gezien
* SALE
   :UNMATCHED
      - hash (per event/POS) of transactions
   :MATCHED
      - has (per event/pos) of matched transactions (EPC + SALE)

* SALE_QUEUE
- queue messages

SCAN & UNMATCHED: used for matching
- remove from UNMATCHED
- 

PACKAGE
 - hash (per event) van EPC data

We gebruiken validated tijdstip als tijdstip van verkoop voor de "matching"

Enkele vragen:
- wnn update/wnn create & webhook faalt (geen 200) hoeveel keer en wanneer opnieuw geprobeerd?
- hoe snel snyct device?
- validated tijdstip is tijdstip van verkoop, te gebruiken voor de "matching"


https://api.weezevent.com/pay/v2/organizations/485376/transactions/actions
Client ID: `0RhXkq6rCT8JTJ47u3ai5EH70MJqtdtDdi3rSfWE`
Client Secret: `7HjARbI8YvXhVNZmXiIo8AvOxH9DHbayEupMKdpy`

{"soldAt":1710241980561,"transaction_id":50,"transaction_row_id":76,"quantity":6,"status":"pending","matched":0}


//Test Scan EPC
{
  "POSID": "62b6db49-0c07-4e8a-ae92-000462b6db49",
  "tags": [
     {
        "EPC": "330593D1EB7F600000008D24",
        "first_seen": "2024-03-12 07:58:34",
        "last_seen": "2024-03-12 07:58:51",
        "count": 40
     },
     {
        "EPC": "330593D1EB7F6000000003F2",
        "first_seen": "2024-03-12 07:58:36",
        "last_seen": "2024-03-12 07:58:52",
        "count": 28
     },
     {
        "EPC": "330593D1EB7F600000008D14",
        "first_seen": "2024-03-12 07:58:41",
        "last_seen": "2024-03-12 07:58:52",
        "count": 16
     },
     {
        "EPC": "330593D1EB7F600000008D1B",
        "first_seen": "2024-03-12 07:58:43",
        "last_seen": "2024-03-12 07:58:51",
        "count": 9
     },
     {
        "EPC": "330593D1EB7F600000008D2A",
        "first_seen": "2024-03-12 07:58:44",
        "last_seen": "2024-03-12 07:58:51",
        "count": 12
     },
     {
        "EPC": "330593D1EB7F600000008D25",
        "first_seen": "2024-03-12 07:58:46",
        "last_seen": "2024-03-12 07:58:51",
        "count": 7
     }
  ]
}


Server: Portainer with Redis Stack
https://redis-goodless.fanarena.com:9443/
admin sm1819

ssh root@redis-goodless.fanarena.com:9443
backups location: ls -l /data/compose/2/my-redis-data
manual backup: sudo tar -czvf my-redis-data-backup.tar.gz /data/compose/2/my-redis-data

scp root@redis-goodless.fanarena.com:/var/lib/docker/my-redis-data-backup.tar.gz ~/Desktop/

TODO automated backups to AWS?

```
version: '3'
services:
  redis-stack-server:
    image: redis/redis-stack-server:latest
    # use REDIS_ARGS for redis-stack-server instead of command arguments
    environment:
      # - REDIS_ARGS=--save 1200 32
      REDIS_ARGS: "--requirepass bigredisbigresults23"
      REDISEARCH_ARGS: "MAXSEARCHRESULTS -1"
      # REDISJSON_ARGS: arguments for RedisJSON
      # REDISGRAPH_ARGS: arguments for RedisGraph
      # REDISTIMESERIES_ARGS: arguments for RedisTimeSeries
      # REDISBLOOM_ARGS: arguments for RedisBloom    
    ports:
      - 6379:6379
    volumes:
      - ./my-redis-data:/data
```

https://medium.com/@joshisoftynakul/deploying-a-redis-stack-cluster-using-docker-images-along-with-redisinsight-e3588f038a40

//TODO Improve Redis save
// redis
// .multi()
// .set("foo", "bar")
// .get("foo")
// .exec((err, results) => {
//   // results === [[null, 'OK'], [null, 'bar']]
// });
//https://chat.openai.com/c/85148770-5e3c-4ec8-973a-e5e31d67fb69