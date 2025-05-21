FROM node:18-alpine

# 创建工作目录
WORKDIR /usr/src/app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 设置环境变量
ENV NODE_ENV=production

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["node", "dist/index.js"] 