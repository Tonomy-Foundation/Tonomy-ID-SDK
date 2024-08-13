# Run a Block Producer Node

### Config.ini&#x20;

```
# BP Settings
producer-name = ivote4waxusa
signature-provider =  pubkey=KEY:privkey
read-only-threads = 0
block-log-retain-blocks = 0

# Common Settings (customise based on your node)
blocks-dir = "/data/Pangea/blocks"
agent-name = pangea-bp-node-{yourname}
http-server-address = 0.0.0.0:8888
p2p-listen-endpoint = 0.0.0.0:9876
p2p-server-address = pangea.website.com:9875

plugin = eosio::http_plugin
plugin = eosio::chain_api_plugin
plugin = eosio::db_size_api_plugin

access-control-allow-origin = *
access-control-allow-headers = Origin, X-Requested-With, Content-Type, Accept
http-validate-host = false
verbose-http-errors = true
abi-serializer-max-time-ms = 2000
http-max-response-time-ms = 100000

disable-subjective-p2p-billing = false
disable-subjective-api-billing = false
subjective-account-decay-time-minutes = 60

resource-monitor-space-threshold = 98
chain-state-db-size-mb = 120000
database-map-mode = mapped_private

max-clients = 150
sync-fetch-span = 200
p2p-max-nodes-per-host = 100

chain-threads = 4
net-threads = 4
http-threads = 8
producer-threads = 4

```

Make sure you also add the relevant p2p-peer-address values from Peer Addresses to the end of the **config.ini** file

#### Run nodeos

```
nodeos --config-dir /path/to/config --data-dir /path/to/data
```
