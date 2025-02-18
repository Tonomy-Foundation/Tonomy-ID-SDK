# Develop

Pangea smart contracts are written in **C++** using the **CDT** compiler toolkit.

Example (Basic Token Transfer):

{% code title="<token.cpp>" %}
```cpp
#include <eosio/asset.hpp>
#include <eosio/print.hpp>

using namespace eosio;

class [[eosio::contract("mycontract")]] mycontract : public contract {
public:
    using contract::contract;

    [[eosio::action]]
    void transfer(const name& from, const name& to, const asset& quantity, const std::string& memo) {
        eosio::require_auth({from, get_self()});
        eosio::print("Transfer from ", from, " to ", to, " amount ", quantity);
    }
};
```
{% endcode %}

See the [Antelope Smart Contract developer documentation](https://docs.antelope.io/docs/latest/getting-started/smart-contract-development/) to finish writing your smart contract.
