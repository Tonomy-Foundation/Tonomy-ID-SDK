#!/bin/bash

ARG1=$1

set -u ## exit if you try to use an uninitialised variable
set -e ## exit if any statement fails

# Make sure working dir is same as this dir, so that script can be excuted from another working directory
PARENT_PATH=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

# Build Ethereum Token
cd "${PARENT_PATH}/Ethereum-token"
if [ ! -d "node_modules" ]; then
    echo "EthereumToken: Installing dependencies"
    yarn install
fi
if [ ! -d "artifacts" ]; then
    echo "EthereumToken: Compiling contracts"
    yarn compile
fi

echo "Copying EthereumToken ABI"
cp "${PARENT_PATH}/Ethereum-token/artifacts/contracts/TonomyToken.sol/TonomyToken.json" "${PARENT_PATH}/src/sdk/services/ethereum/abi/TonomyToken.json"