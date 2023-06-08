#!/bin/bash

BRANCH_NAME=$(git symbolic-ref --short HEAD)

sed -i.bak "s/BRANCH_NAME/$BRANCH_NAME/g" package.json

echo "Preparing release for branch: $BRANCH_NAME"
