#!/bin/bash

# AirAccount Sepolia测试网启动脚本

echo "=== 启动AirAccount Sepolia测试网环境 ==="

# 检查环境变量
if [ -z "$RPC_URL" ] || [ -z "$PRIVATE_KEY" ]; then
    echo "错误: 请设置环境变量 RPC_URL 和 PRIVATE_KEY"
    echo "请参考 README_SEPOLIA.md 进行配置"
    exit 1
fi

# 1. 启动MongoDB（如果未运行）
echo "1. 检查MongoDB..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "启动MongoDB..."
    brew services start mongodb-community@7.0
    sleep 3
else
    echo "MongoDB已在运行"
fi

# 2. 编译合约
echo "2. 编译合约..."
cd contracts
forge build
if [ $? -ne 0 ]; then
    echo "合约编译失败"
    exit 1
fi

# 3. 部署合约（如果需要）
echo "3. 检查合约部署..."
if [ ! -f "deployments/sepolia.json" ] || [ "$(jq -r '.accountFactory' deployments/sepolia.json)" == "" ]; then
    echo "部署合约到Sepolia..."
    forge script script/DeploySepolia.s.sol:DeploySepolia --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
    if [ $? -ne 0 ]; then
        echo "合约部署失败"
        exit 1
    fi
else
    echo "合约已部署"
fi

# 4. 启动后端服务
echo "4. 启动后端服务..."
cd ../backend
if [ ! -f ".env" ]; then
    echo "创建后端环境配置..."
    cp .env.example .env
    echo "请更新 backend/.env 文件中的配置"
fi

npm install
npm run start:dev &
BACKEND_PID=$!

# 5. 启动前端服务
echo "5. 启动前端服务..."
cd ../frontdoor
npm install
npm run dev &
FRONTEND_PID=$!

# 6. 等待服务启动
echo "6. 等待服务启动..."
sleep 10

# 7. 检查服务状态
echo "7. 检查服务状态..."
echo "后端服务: http://localhost:3001"
echo "前端服务: http://localhost:3000"
echo "Sepolia测试网: $RPC_URL"

# 8. 显示部署的合约地址
echo "8. 部署的合约地址:"
if [ -f "../contracts/deployments/sepolia.json" ]; then
    cat ../contracts/deployments/sepolia.json | jq .
fi

echo ""
echo "=== 启动完成 ==="
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "echo '停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait 