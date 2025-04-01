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
    git checkout "${SDK_BRANCH}"
    export BUILD_TEST=true
    ./delete-built-contracts.sh
    ./build-contracts.sh

    # Install dependencies Tonomy Communication
    cd "${SDK_DIR}"
    git checkout "${BRANCH}"
    yarn
    yarn run build:cli
}

installbranch "before"
cd "${SDK_DIR}"
yarn run init

installbranch "after"
cd "${SDK_DIR}"
yarn run cli msig propose symbol migrate --auto-execute