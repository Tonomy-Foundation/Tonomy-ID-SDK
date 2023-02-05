#!/bin/bash

./nodeos.sh &

sleep 10

cd /var/sdk
npm run test