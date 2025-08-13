#!/bin/bash

# If ARG1=local then will use local cdt-cpp, otherwise will use docker cdt-cpp
ARG1=$1

set -u ## exit if you try to use an uninitialised variable
set -e ## exit if any statement fails

# Make sure working dir is same as this dir, so that script can be excuted from another working directory
PARENT_PATH=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

echo "Checking for submodules"
git submodule update --init --recursive

echo "Tonomy Contracts: Building smart contracts"
cd "${PARENT_PATH}/Tonomy-Contracts"
./build-contracts.sh

CONTRACTS=(
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
    echo "Tonomy Contracts: Copying ${CONTRACT} ABI"
    cp "./contracts/${CONTRACT}/${CONTRACT}.abi" "${PARENT_PATH}/src/sdk/services/blockchain/contracts/abi/${CONTRACT}.abi.json"
done

# Build Ethereum Token
cd "${PARENT_PATH}/Ethereum-token"
if [ ! -d "node_modules" ]; then
    echo "Ethereum Token Contract: Installing dependencies"
    yarn install
fi
if [ ! -d "artifacts" ]; then
    echo "Ethereum Token Contract: Compiling contracts"
    yarn compile
fi

echo "Ethereum Token Contract: Copying ABI"
cp "${PARENT_PATH}/Ethereum-token/artifacts/contracts/TonomyToken.sol/TonomyToken.json" "${PARENT_PATH}/src/sdk/services/ethereum/abi/TonomyToken.json"

echo "All contract ABIs copied successfully"
