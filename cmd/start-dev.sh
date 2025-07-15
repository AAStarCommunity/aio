#!/bin/bash
# start-dev.sh

echo "🚀 Starting AirAccount development environment..."

# 启动anvil (后台)
echo "Starting Anvil..."
anvil --host 0.0.0.0 --port 8545 --chain-id 31337 &
ANVIL_PID=$!

# 等待anvil启动
sleep 3

# 部署合约
echo "Deploying contracts..."
cd contracts
forge script script/DeployAAContracts.s.sol:DeployAAContracts \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://localhost:8545 \
  --broadcast

# 启动其他服务
echo "Starting services..."
cd ../stackup-bundler && go run main.go --config config.yml &
cd ../backend && npm start &
cd ../frontdoor && npm run dev &

echo "✅ All services started!"
echo "🌐 Frontend: http://localhost:3001"
echo "🔧 Backend: http://localhost:3000"
echo "📦 Bundler: http://localhost:4337"
echo "⛓️ Anvil: http://localhost:8545"

# 等待所有进程
wait