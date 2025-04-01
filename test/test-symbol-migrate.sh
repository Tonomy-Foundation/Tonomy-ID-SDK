#!/bin/bash

set -u ## exit if you try to use an uninitialised variable
set -e ## exit if any statement fails

# Make sure working dir is same as this dir, so that script can be excuted from another working directory
PARENT_PATH=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
SDK_DIR="${PARENT_PATH}/.."
cd "${SDK_DIR}"

function installbranch {
    BRANCH=$1
    if [ "${BRANCH}" == "before" ]; then
        SDK_BRANCH="development"
        CONTRACTS_BRANCH="development"
    else
        SDK_BRANCH="feature/token-symbol-upgrade"
        CONTRACTS_BRANCH="feature/update-token"
    fi

    # Build Tonomy Blockchain image
    cd "${SDK_DIR}/Tonomy-Contracts"
    git checkout "${CONTRACTS_BRANCH}"
    export BUILD_TEST=true
    cd "${SDK_DIR}/Tonomy-Contracts/contracts/tonomy" && rm -rf *.wasm && rm -rf *.abi
    cd "${SDK_DIR}/Tonomy-Contracts/contracts/eosio.token" && rm -rf *.wasm && rm -rf *.abi
    cd "${SDK_DIR}/Tonomy-Contracts/contracts/staking.tmy" && rm -rf *.wasm && rm -rf *.abi
    cd "${SDK_DIR}/Tonomy-Contracts/contracts/vesting.tmy" && rm -rf *.wasm && rm -rf *.abi
    cd "${SDK_DIR}/Tonomy-Contracts"
    ./build-contracts.sh

    # Install dependencies Tonomy Communication
    cd "${SDK_DIR}"
    git checkout "${SDK_BRANCH}"
    yarn
    yarn run build:cli
}

installbranch "before"
cd "${SDK_DIR}"
yarn run test:setup
. ./test/export_test_keys.sh
export SIGNING_KEY="${TONOMY_OPS_PRIVATE_KEY}"
echo "finished exporting test keys"
echo "setting up some vesting allocations"
yarn run cli vesting assign coinsale.tmy team.tmy "1000.000000 LEOS" 7
yarn run cli vesting assign coinsale.tmy team.tmy "1000.000000 LEOS" 7
yarn run cli vesting assign coinsale.tmy team.tmy "1000.000000 LEOS" 8
yarn run cli vesting assign coinsale.tmy found.tmy "1000.000000 LEOS" 7
echo "finished setting up some vesting allocations"

installbranch "after"
echo "finished installing branch after"
cd "${SDK_DIR}"
. ./test/export_test_keys.sh
echo "finished exporting test keys"
yarn run cli msig propose symbol migrate symmig --auto-execute > out.log 2>&1
echo "finished proposing symbol migrate"