Location ID !!!
node app.js
node activation-worker.js FTIKortrijk


Enkele vragen:
- organisation_id, item id/name, etc zullen dezelfde zijn voor het event?
- soms krijgt dezelfde data 'create' en soms nog eens 'update' maar ik zie niet direct een verschil?
- op de device zie ik ook "cups" en "return" items staan, maar deze zullen niet gebruikt worden op het event - enkel drank in smartcups @Rudi De Kerpel | Goodless ?
- hoe snel snyct device?
- webhook faalt (geen 200) hoeveel keer en wanneer opnieuw geprobeerd?
- validated tijdstip is tijdstip van verkoop, te gebruiken voor de "matching"
- handheld device zelfde als op event


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