#!/bin/bash

set -u ## exit if you try to use an uninitialised variable
set -e ## exit if any statement fails

# Make sure working dir is same as this dir, so that script can be excuted from another working directory
PARENT_PATH=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
cd "${PARENT_PATH}/.."
pwd

# Setup Tonomy Contracts
if [ ! -d "Tonomy-Contracts" ]; then
    git clone https://github.com/Tonomy-Foundation/Tonomy-Contracts.git
fi
cd Tonomy-Contracts
git checkout feature/96-integration-tests-in-sdk
git pull

# Build Tonomy Contracts
./build-contracts.sh

# Create docker image
docker image build --target nodejs . -f ./blockchain/Dockerfile --force-rm -t tonomytestcontainer

# Run integration tests
cd ../
docker run -v ${PARENT_PATH}/..:/var/sdk tonomytestcontainer ./var/sdk/integration-test/run-tests-script.sh