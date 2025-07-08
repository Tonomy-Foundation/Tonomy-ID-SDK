#!/bin/bash

# If ARG1=local then will use local cdt-cpp, otherwise will use docker cdt-cpp
ARG1=$1

set -u ## exit if you try to use an uninitialised variable
set -e ## exit if any statement fails

# Make sure working dir is same as this dir, so that script can be excuted from another working directory
PARENT_PATH=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

echo "Copying smart contracts ABIs"

CONTRACTS=(
    "demo.tmy"
    "eosio.bios"
    "eosio.msig"
    "eosio.token"
    "eosio.tonomy"
    "tonomy"
    "vesting.tmy"
    "staking.tmy"
)

for CONTRACT in "${CONTRACTS[@]}"
do
    echo "Copying ${CONTRACT} ABI"
    cp "${PARENT_PATH}/Tonomy-Contracts/contracts/${CONTRACT}/${CONTRACT}.abi" "${PARENT_PATH}/src/sdk/services/blockchain/contracts/abi/${CONTRACT}.abi.json"
done

echo "All contract ABIs copied successfully"