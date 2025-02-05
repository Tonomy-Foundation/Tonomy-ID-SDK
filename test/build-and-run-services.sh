#!/bin/bash

ARG1=$1

set -u ## exit if you try to use an uninitialised variable
set -e ## exit if any statement fails

# Make sure working dir is same as this dir, so that script can be excuted from another working directory
PARENT_PATH=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
SDK_DIR="${PARENT_PATH}/.."
cd "${SDK_DIR}"

function setup {
    # Setup Tonomy Contracts and Tonomy Communication git submodules
    if [ ! -d "Tonomy-Contracts/contracts" ]; then
        git submodule update --init --recursive
        git submodule foreach git checkout development
        git submodule foreach git pull
    fi

    # Build Tonomy Blockchain image
    cd "${SDK_DIR}/Tonomy-Contracts"
    ./blockchain/build-docker.sh

    # Install dependencies SDK
    cd "${SDK_DIR}"
    if [ ! -d "node_modules" ]; then
        yarn install
    fi
    if [ ! -d "build" ]; then
        yarn run build
    fi
    if [ ! -d "build/cli" ]; then
        yarn run build:cli
    fi

    # Install dependencies Tonomy Communication
    cd "${SDK_DIR}/Tonomy-Communication"
    if [ ! -d "node_modules" ]; then
        yarn install
    fi
}

function start {
    # Run blockchain node
    cd "${SDK_DIR}"
    docker run -p 8888:8888 --name tonomy_blockchain_integration -d tonomy_blockchain_initialized
    echo "Waiting 8 seconds for blockchain node to start"
    sleep 8

    # Run Communication server
    cd  "$SDK_DIR/Tonomy-Communication"
    npx pm2 stop micro || true
    npx pm2 delete micro || true
    unset TONOMY_OPS_PRIVATE_KEY
    unset HCAPTCHA_SECRET
    npx pm2 start --interpreter /bin/bash yarn --name "micro" -- run start
}

function bootstrap {
    echo "WARNING: Make sure you have built the smart contract with:"
    echo "export BUILD_TEST=true"
    echo "./Tonomy-Contracts/delete-buildt-contracts.sh"
    echo "./Tonomy-Contracts/build_contracts.sh"
    sleep 2

    # Run bootstrap script
    cd "$SDK_DIR"

    # For development environment use set keys, otherwise these should be set in the environment
    NODE_ENV="${NODE_ENV:-development}"
    if [[ "${NODE_ENV}" == "development" ]]
    then
        echo "Using development environment: setting keys"
        source ./test/export_test_keys.sh
    fi
    yarn run cli bootstrap
}

function stop {
    # Stop blockchain node
    docker exec -it tonomy_blockchain_integration ./nodeos.sh stop || true
    docker rm -f tonomy_blockchain_integration || true

    # Stop Communication server
    npx pm2 stop micro || true
    npx pm2 delete micro || true
}

function help {
    echo "Usage: $0 [start|stop]"
    echo ""
    echo "start: Setup and start blockchain node and communication server"
    echo "stop: Stop blockchain node and communication server"
}

if [ -z "$ARG1" ]
then
    help
elif [ "$ARG1" == "start" ]
then
    setup
    stop
    start
    bootstrap
elif [ "$ARG1" == "stop" ]
then
    stop
else
    help
fi
