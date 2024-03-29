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
    pm2 stop micro || true
    pm2 delete micro || true
    unset CREATE_ACCOUNT_PRIVATE_KEY
    unset HCAPTCHA_SECRET
    pm2 start --interpreter /bin/bash yarn --name "micro" -- run start:dev
}

function bootstrap {
    # Run bootstrap script
    cd  "$SDK_DIR"
    yarn run cli bootstrap PVT_K1_2bfGi9rYsXQSXXTvJbDAPhHLQUojjaNLomdm3cEJ1XTzMqUt3V
}

function stop {
    # Stop blockchain node
    docker exec -it tonomy_blockchain_integration ./nodeos.sh stop || true
    docker rm -f tonomy_blockchain_integration || true

    # Stop Communication server
    pm2 stop micro || true
    pm2 delete micro || true
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
