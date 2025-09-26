#!/bin/bash

# If ARG1=local then will use local cdt-cpp, otherwise will use docker cdt-cpp
ARG1=$1

set -e ## exit if any statement fails

# Make sure working dir is same as this dir, so that script can be excuted from another working directory
PARENT_PATH=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

# Get the current git branch. If in CI on a non-standard branch, use development
echo "GITHUB_ACTIONS: ${GITHUB_ACTIONS}"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: ${BRANCH}"
if [ "${GITHUB_ACTIONS}" == "true" ] && [ "${BRANCH}" != "master" ] && [ "${BRANCH}" != "testnet" ] && [ "${BRANCH}" != "development" ]; then
    BRANCH="development"
fi
echo "Using branch: ${BRANCH}"

# Submodule update needs to work locally, in the Github pipeline, and in the Github pipeline to build the Tonomy-Communication Docker container
echo "Checking submodules"
if [ ! -d "${PARENT_PATH}/Ethereum-token/contracts" ]; then
    echo "Updating submodules: Ethereum-token"
    git submodule update --init --recursive Ethereum-token
    cd Ethereum-token
    git checkout ${BRANCH}
    git pull
    cd ../
fi
if [ ! -d "${PARENT_PATH}/Tonomy-Contracts/contracts" ]; then
    echo "Updating submodules: Tonomy-Contracts"
    git submodule update --init --recursive Tonomy-Contracts
    cd Tonomy-Contracts
    git checkout ${BRANCH}
    git pull
    cd ../
fi
if [ ! -d "${PARENT_PATH}/Tonomy-Communication/src" ]; then
    echo "Updating submodules: Tonomy-Communication"
    git submodule update --init --recursive Tonomy-Communication
    cd Tonomy-Communication
    git checkout ${BRANCH}
    git pull
    cd ../
fi

cd "${PARENT_PATH}/Tonomy-Contracts"
if [ ! -f "contracts/eosio.token/eosio.token.wasm" ]; then
    echo "Tonomy Contracts: Building smart contracts"
    ./build-contracts.sh
fi

CONTRACTS=(
    "eosio.bios"
    "eosio.msig"
    "eosio.token"
    "eosio.tonomy"
    "tonomy"
    "vesting.tmy"
    "staking.tmy"
)

# Ensure destination directory for EOSIO contract ABIs exists
mkdir -p "${PARENT_PATH}/src/sdk/services/blockchain/contracts/abi"

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
    yarn run compile
fi

echo "Ethereum Token Contract: Copying ABI"
mkdir -p "${PARENT_PATH}/src/sdk/services/ethereum/abi"
cp "./artifacts/contracts/TonomyToken.sol/TonomyToken.json" "${PARENT_PATH}/src/sdk/services/ethereum/abi/TonomyToken.json"

echo "Generating Typechain types for Ethereum ABIs"
cd "${PARENT_PATH}"
mkdir -p "src/sdk/services/ethereum/typechain"
npx typechain --target ethers-v6 --out-dir src/sdk/services/ethereum/typechain 'src/sdk/services/ethereum/abi/*.json'

echo "All contract ABIs copied successfully"
