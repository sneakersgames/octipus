API LOAD BALANCER
- TODO: Check Auth header and Save incoming `activation` request to QUEUE

- /scan
  TODO
    - scannerID -> return scan or activation scan?
      save PACKAGE or BIN.... ???
<!-- - /return -->
- /upload: LEGACY to OCTOPUS BATCH EPC

** Starnet Database -> Kassa:104605:
Kassa X -> Timestamp transaction: 10:46:05 -> 2 cups -> EPC's
Kassa X -> Timestamp transaction: 10:46:01 -> 1 cup -> EPC's

Als tijd kassa voorloopt -> verkoop om 10:01 ipv 10:00 -> scans zijn van 10:00 -> zitten bij de "vorige" transactie mogelijks? -> probleem als vorige transactie geen match had, indien wel match -> kan niet gematcht worden dus kopppelen op volgende
Als tijd kassa achterloopt -> verkoop om 10:00 ipv 10:01 -> scans zijn van 10:00 -> geen probleem want geen "nieuwere" transactie

Telkens laatste transactie opvragen van een bepaalde kassa -> timestamps, kaartnummer, aantal bekers

- Activation worker Process from QUEUE -> `activate` (add card and tx)


[SALES] Kassa.Timestamp -> Kaartnummer, Bekers, TX
[SCANS] Kassa -> [{EPC, last_seen}]
[EPC] EPC.Kassa -> last_seen

FIND NEAREST TO 199 in TX STARNET
  - check count

Refund endpoint
- Check Auth, check EPC, send refund request, update information


Timestamp van de kassa checken?

1:00:00 -> betaling bevestigd en in startnet
1:00:02 -> scans bekers
1:00:06 -> scans bekers
====
1:00:09 -> volgende betaling