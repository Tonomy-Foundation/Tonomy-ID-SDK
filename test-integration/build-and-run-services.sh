#!/bin/bash

set -u ## exit if you try to use an uninitialised variable
set -e ## exit if any statement fails

# Make sure working dir is same as this dir, so that script can be excuted from another working directory
PARENT_PATH=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
SDK_DIR="${PARENT_PATH}/.."
cd "${SDK_DIR}"

# Setup Tonomy Contracts and Tonomy Communication
if [ ! -d "Tonomy-Contracts" ]; then
    git submodule update --init --recursive
    git submodule foreach git checkout development
    git submodule foreach git pull
fi

# Build Tonomy Blockchain image
cd "${SDK_DIR}/Tonomy-Contracts"
./blockchain/build-docker.sh

# Install dependencies
cd "${SDK_DIR}"
if [ ! -d "node_modules" ]; then
    npm i
fi
if [ ! -d "build" ]; then
    npm run build
fi
cd "${SDK_DIR}/Tonomy-Communication"
if [ ! -d "node_modules" ]; then
    npm i
fi

# Run blockchain node
cd "${SDK_DIR}"
docker exec -it tonomy_blockchain_integration ./nodeos.sh stop || true
docker rm -f tonomy_blockchain_integration || true
docker run -p 8888:8888 --name tonomy_blockchain_integration -d tonomy_blockchain_initialized
echo "Waiting 8 seconds for blockchain node to start"
sleep 8

# Run Communication server
cd  "$SDK_DIR/Tonomy-Communication"
pm2 stop micro || true
pm2 delete micro || true
pm2 start yarn --name "micro" -- run start:dev

# Run bootstrap script
cd  "$SDK_DIR"
npm run cli bootstrap