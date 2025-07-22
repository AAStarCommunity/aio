#!/bin/bash
set -a
source .env
set +a
forge create src/core/EntryPoint.sol:EntryPoint --private-key $PRIVATE_KEY --rpc-url $RPC_URL --verify