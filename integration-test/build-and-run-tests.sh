#!/bin/bash

set -u ## exit if you try to use an uninitialised variable
set -e ## exit if any statement fails

# Make sure working dir is same as this dir, so that script can be excuted from another working directory
PARENT_PATH=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
SDK_DIR="${PARENT_PATH}/.."
cd "${SDK_DIR}"

# Setup Tonomy Contracts
if [ ! -d "Tonomy-Contracts" ]; then
    git clone https://github.com/Tonomy-Foundation/Tonomy-Contracts.git
fi
cd Tonomy-Contracts
# TODO update to development
git checkout feature/96-integration-tests-in-sdk
git pull

# Build Tonomy Contracts
./build-contracts.sh

# Create docker image
docker image build --target initialized . -f ./blockchain/Dockerfile --force-rm -t tonomytestimage

# Run container
cd "${SDK_DIR}"
# docker run -v ${PARENT_PATH}/..:/var/sdk --name tonomytestcontainer tonomytestimage /var/sdk/integration-test/run-tests-script.sh
docker run --name tonomytestcontainer -d tonomytestimage
sleep 10

# Run integration tests
set +e
npm run test:integration

docker exec -it tonomytestcontainer ./nodeos.sh stop
set -e
