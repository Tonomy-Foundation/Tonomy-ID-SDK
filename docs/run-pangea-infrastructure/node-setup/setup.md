# Setup

Before start, make sure you go through these steps:

* [Install the Antelope software](https://docs.eosnetwork.com/manuals/leap/v3.2.3/install/) before starting this section.
* It is assumed that nodeos, cleos, and keosd are accessible through the path.&#x20;
* Know how to pass [Nodeos options](https://docs.eosnetwork.com/manuals/leap/v3.2.3/nodeos/usage/nodeos-options) to enable or disable functional

## Peer Addresses

Add the following values of p2p-peer-address at the end of your config.ini file so that it connects to existing nodes in the network.

#### Pangea Mainnet

```
p2p-nodes
# 1.prod.tmy
p2p-peer-address = 135.181.35.32:9876
# 2.prod.tmy
p2p-peer-address = 78.46.191.87:9876
# 3.prod.tmy
p2p-peer-address = 5.161.199.183:9876
# eosusa
p2p-peer-address = pangea.eosusa.io:9886
```

#### genesis.json

```
{
  "initial_key": "PUB_K1_6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5BoDq63",
  "initial_configuration": {
    "max_transaction_delay": 3888000,
    "min_transaction_cpu_usage": 100,
    "net_usage_leeway": 500,
    "context_free_discount_net_usage_den": 100,
    "max_transaction_net_usage": 524288,
    "context_free_discount_net_usage_num": 20,
    "max_transaction_lifetime": 3600,
    "deferred_trx_expiration_window": 600,
    "max_authority_depth": 6,
    "max_transaction_cpu_usage": 5000000,
    "max_block_net_usage": 1048576,
    "target_block_net_usage_pct": 1000,
    "max_generated_transaction_count": 16,
    "max_inline_action_size": 4096,
    "target_block_cpu_usage_pct": 1000,
    "base_per_transaction_net_usage": 12,
    "max_block_cpu_usage": 50000000,
    "max_inline_action_depth": 4
  },
  "initial_timestamp": "2024-04-19T12:34:56.000"
}
```

#### Pangea Testnet

```
p2p-nodes
# pangea testnet
p2p-peer-address = test.pangea.eosusa.io:9886
```

#### genesis.json

```
{
  "initial_timestamp": "2018-06-01T12:00:00.000",
  "initial_key": "EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV",
  "initial_configuration": {
    "max_block_net_usage": 1048576,
    "target_block_net_usage_pct": 1000,
    "max_transaction_net_usage": 524288,
    "base_per_transaction_net_usage": 12,
    "net_usage_leeway": 500,
    "context_free_discount_net_usage_num": 20,
    "context_free_discount_net_usage_den": 100,
    "max_block_cpu_usage": 200000,
    "target_block_cpu_usage_pct": 1000,
    "max_transaction_cpu_usage": 150000,
    "min_transaction_cpu_usage": 100,
    "max_transaction_lifetime": 3600,
    "deferred_trx_expiration_window": 600,
    "max_transaction_delay": 3888000,
    "max_inline_action_size": 524288,
    "max_inline_action_depth": 4,
    "max_authority_depth": 6
  }
}
```
