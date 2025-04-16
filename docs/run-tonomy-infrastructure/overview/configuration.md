# Configuration

## Configurations

The plugin-specific options can be configured using either CLI options or a configuration file, config.ini

**config.ini** options can be found by running **nodeos --help**

The default config.ini can be found in the following folder on Linux: **\~/.local/share/eosio/nodeos/config**

A custom **config.ini** file can be set by passing the nodeos option&#x20;

**--config path/to/config.ini.**

### Nodeos Example

&#x20;Typical usage of nodeos when starting a block producing node using command line only:

```
nodeos \
  -e -p eosio \
  --data-dir /users/mydir/eosio/data     \
  --config-dir /users/mydir/eosio/config \
  --plugin eosio::producer_plugin      \
  --plugin eosio::chain_plugin         \
  --plugin eosio::http_plugin          \
  --plugin eosio::state_history_plugin \
  --contracts-console   \
  --disable-replay-opts \
  --access-control-allow-origin='*' \
  --http-validate-host=false        \
  --verbose-http-errors             \
  --state-history-dir /shpdata \
  --trace-history              \
  --chain-state-history        \
  >> nodeos.log 2>&1 &
```
