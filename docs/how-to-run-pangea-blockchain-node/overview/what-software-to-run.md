# What software to run?

Antelope ships with 3 major software components needed to run a Pangea node.

### Nodeos

nodeos is the core service daemon that runs on every Antelope node. It can be configured to process smart contracts, validate transactions, produce blocks containing valid transactions, and confirm blocks to record them on the blockchain.

### Cleos

cleos is a command line tool that interfaces with the REST API exposed by nodeos. Developers can also use cleos to deploy and test Antelope smart contracts.

### Keosd

keosd is a key manager service daemon for storing private keys and signing digital messages. It provides a secure key storage medium for keys to be encrypted at rest in the associated wallet file. keosd also defines a secure enclave for signing transaction created by cleos or a third part library.

## Installation

These software are distributed as part of the [Antelope software suite](https://github.com/AntelopeIO/leap). To install, visit the [Antelope Software Installation](https://docs.eosnetwork.com/manuals/leap/v3.2.3/install/) section.
