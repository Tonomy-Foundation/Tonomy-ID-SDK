#!/bin/bash

echo "Running nodeos in background"
./nodeos.sh > nodeos.log 2>&1 &

echo "Waiting for nodeos to start"
sleep 10

echo "Running tests"
cd /var/sdk
npm run test:integration