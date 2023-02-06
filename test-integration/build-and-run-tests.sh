#!/bin/bash

set -u ## exit if you try to use an uninitialised variable
set -e ## exit if any statement fails

# Make sure working dir is same as this dir, so that script can be excuted from another working directory
PARENT_PATH=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
SDK_DIR="${PARENT_PATH}/.."
cd "${SDK_DIR}"

# Setup Tonomy Contracts
git submodule init
cd "${SDK_DIR}/Tonomy-Contracts"
git checkout development
git pull

# Build Tonomy Blockchain image
./blockchain/build-docker.sh

# Install dependencies
cd "${SDK_DIR}"
if [ ! -d "node_modules" ]; then
    npm i
fi

# Run container
cd "${SDK_DIR}"
docker rm -f tonomy_blockchain_integration || true
docker run -p 8888:8888 --name tonomy_blockchain_integration -d tonomy_blockchain_initialized
echo "Waiting 8 seconds for blockchain node to start"
sleep 8

# Run integration tests
npm run bootstrap
npm run test:integration || true

docker exec -it tonomy_blockchain_integration ./nodeos.sh stop || true