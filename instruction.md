# **AAStar 项目需求设计文档**

## **1\. 项目概述**

### **1.1 项目背景**

当前以太坊生态中，用户使用 MetaMask 等传统钱包进行交易时，面临以下问题：

* **用户体验差**：私钥管理复杂，Gas 费支付流程繁琐。  
* **安全性风险**：私钥易丢失或被盗，存在安全隐患。  
* **功能限制**：交易逻辑固定，无法实现更灵活的交易策略。

为了解决这些问题，我们拟开发 AAStar 项目，旨在通过 **账户抽象** 技术，为用户提供 **Web2.0 风格** 的以太坊交易体验。

### **1.2 项目目标**

* **用户体验**：实现邮箱注册、Passkey 签名等 Web2.0 式操作，降低用户使用门槛。  
* **安全性**：利用 Passkey 和 BLS 签名等技术，提高用户资产安全性。  
* **灵活性**：支持自定义交易逻辑，满足用户多样化的交易需求。  
* **兼容性**：完全兼容 ERC-4337 标准，与现有以太坊生态无缝衔接。

### **1.3 项目功能**

AAStar 项目将实现以下核心功能：

* **账户管理**：  
  * 用户通过邮箱注册并绑定 Passkey，创建 AA 账户。  
  * 支持用户登录，使用 Passkey 进行身份验证。  
* **交易发起**：  
  * 用户在前端输入交易信息（目标地址、金额等），发起交易。  
  * 系统自动构造符合 ERC-4337 标准的 UserOperation。  
* **交易签名**：  
  * 用户使用 Passkey 对 UserOperation 进行签名。  
  * 系统采用 BLS 聚合签名技术，实现多方签名验证。  
* **交易执行**：  
  * 系统将签名后的 UserOperation 提交到以太坊网络。  
  * AA 账户验证签名并执行交易。  
* **Gas 费支付**：  
  * 系统集成 Paymaster 服务，为用户支付 Gas 费用。  
  * 用户无需持有 ETH 即可完成交易。  
* **BLS 节点管理**：  
  * 支持 BLS 节点的注册和管理。  
  * 实现 BLS 节点的签名协调和聚合。

## **2\. 技术架构**

### **2.1 模块划分**

AAStar 项目采用模块化设计，分为以下四个模块：

* **前端模块**：负责用户交互，实现用户注册、登录、交易发起和结果展示等功能。  
* **后端模块**：负责处理用户请求，实现 Passkey 签名验证、BLS 签名协调、交易构造和提交等功能。  
* **BLS 节点模块**：负责 Passkey 签名验证和 BLS 签名生成，参与多方签名过程。  
* **智能合约模块**：包含项目所需的智能合约，包括 AA 账户合约、合约工厂、EntryPoint 合约和 Paymaster 合约。

### **2.2 技术选型**

* **前端**  
  * 框架：React  
  * 认证：WebAuthn API  
  * 以太坊交互：Ethers.js  
  * UI 库：(可选) Tailwind CSS、Material UI  
* **后端**  
  * 框架：Node.js、Express  
  * Passkey 验证：@simplewebauthn/server  
  * BLS 签名：@noble/bls12-381  
  * 以太坊交互：Ethers.js、ERC-4337 SDK  
* **BLS 节点**  
  * 语言：Node.js  
  * BLS 签名：@noble/bls12-381  
  * 通信：REST API  
* **智能合约**  
  * 语言：Solidity  
  * 合约库：OpenZeppelin  
  * 部署工具：Hardhat、Foundry  
* **区块链**  
  * 网络：以太坊主网或测试网（Sepolia）  
* **Bundler 服务**  
  * Stackup 或 Pimlico  
* **Paymaster 服务**  
  * 第三方 Paymaster 服务或现成的 Paymaster 合约

### **2.3 模块交互**

* **前端与后端**：通过 API 进行通信，前端发送用户操作请求，后端返回处理结果。  
* **后端与 BLS 节点**：通过 API 进行通信，后端将待签名的 UserOperation 哈希发送给 BLS 节点，BLS 节点返回 BLS 签名。  
* **后端与智能合约**：通过 Web3 提供商（例如 Infura、Alchemy）进行交互，部署合约、调用合约方法等。

### **3\. 模块设计**

### **3.1 前端模块**

* **功能**  
  * 用户注册：收集用户邮箱，调用 WebAuthn API 生成 Passkey，将数据发送给后端。  
  * 用户登录：使用 Passkey 进行身份验证，向后端发送登录请求。  
  * 交易发起：收集用户交易信息（目标地址、金额等），生成 UserOperation，使用 Passkey 签名，将数据发送到后端。  
  * 显示交易状态：接收后端返回的交易结果，并显示给用户。  
* **详细设计**  
  1. **用户注册**  
     * 用户在注册页面输入邮箱。  
     * 前端调用 WebAuthn API 的 create() 方法生成 Passkey。  
     * 前端将邮箱和 Passkey 公钥发送到后端。  
  2. **用户登录**  
     * 用户在登录页面点击登录按钮。  
     * 前端调用 WebAuthn API 的 get() 方法获取 Passkey 签名。  
     * 前端将 Passkey 签名发送到后端进行验证。  
  3. **交易发起**  
     * 用户在交易页面输入目标地址、金额等信息。  
     * 前端使用 Ethers.js 构造符合 EIP-712 标准的 UserOperation 对象。  
     * 前端计算 UserOperation 的哈希值 userOpHash。  
     * 前端调用 WebAuthn API 的 get() 方法，使用 Passkey 对 userOpHash 进行签名。  
     * 前端将 UserOperation 对象和 Passkey 签名发送到后端。  
  4. **交易状态显示**  
     * 前端接收后端返回的交易状态信息。  
     * 前端将交易状态显示在页面上，例如“交易成功”、“交易失败”等。

### **3.2 后端模块**

* **功能**  
  * 用户管理：处理用户注册请求，存储用户信息（邮箱、Passkey 公钥），实现用户登录验证。  
  * 交易处理：接收前端发送的 UserOperation 和签名，验证 Passkey 签名，与 BLS 节点通信，构造和提交 UserOperation，处理交易结果。  
  * BLS 节点管理：(主节点) 协调 BLS 节点的签名过程，收集和聚合 BLS 签名。  
  * Paymaster 集成：使用现成的 Paymaster 服务或合约，获取 Gas 费用资助签名 (paymasterAndData)。  
  * API：提供前端和 BLS 节点调用的 API。  
* **详细设计**  
  1. **用户管理**  
     * **注册**：  
       * 后端接收前端发送的邮箱和 Passkey 公钥。  
       * 后端将 Passkey 公钥加密存储到数据库中，并与用户邮箱关联。  
       * 后端生成 AA 账户地址，并将地址返回给前端。  
     * **登录**：  
       * 后端接收前端发送的 Passkey 签名。  
       * 后端使用存储的 Passkey 公钥验证签名，验证成功则允许用户登录。  
  2. **交易处理**  
     * 后端接收前端发送的 UserOperation 对象和 Passkey 签名。  
     * 后端使用 @simplewebauthn/server 验证 Passkey 签名，确保签名合法且与 UserOperation 一致。  
     * 后端将 UserOperation 对象和 Passkey 签名转发给 BLS 节点进行 BLS 签名。  
     * 后端接收 BLS 节点返回的 BLS 签名，进行聚合。  
     * 后端调用 Paymaster 服务或合约，获取 Gas 费用资助信息，构造完整的 UserOperation 对象。  
     * 后端将构造好的 UserOperation 对象提交给 Bundler。  
     * 后端监听交易执行结果，并将结果返回给前端。  
  3. **BLS 节点管理**  
     * 后端作为主节点，维护 BLS 节点列表。  
     * 后端接收到交易请求后，将 UserOperation 哈希发送给 BLS 节点。  
     * 后端接收 BLS 节点返回的 BLS 签名，并进行聚合。  
  4. **Paymaster 集成**  
     * 后端调用第三方 Paymaster 服务 API，或者与 Paymaster 合约交互，获取 paymasterAndData。

### **3.3 BLS 节点模块**

* **功能**  
  * Passkey 签名验证：验证接收到的 UserOperation 中的 Passkey 签名。  
  * BLS 签名生成：使用 BLS 私钥对 UserOperation 哈希进行签名。  
  * 节点间通信：与后端（或主节点）通信，接收待签名数据，返回 BLS 签名。  
* **详细设计**  
  1. **Passkey 签名验证**  
     * BLS 节点接收后端发送的 UserOperation 哈希和 Passkey 签名。  
     * BLS 节点使用存储的 Passkey 公钥验证签名，确保签名合法且与 UserOperation 一致。  
  2. **BLS 签名生成**  
     * 验证通过后，BLS 节点使用自己的 BLS 私钥对 UserOperation 哈希进行签名。  
  3. **节点间通信**  
     * BLS 节点将生成的 BLS 签名发送回后端（或主节点）。

### **3.4 智能合约模块**

* **功能**  
  * AA 账户合约：实现 AA 账户的逻辑，包括验证 BLS 签名、执行转账交易等。  
  * 合约工厂：使用 CREATE2 部署 AA 账户合约。  
  * EntryPoint 合约：ERC-4337 标准合约，用于接收和处理 UserOperation。  
* **详细设计**  
  1. **AA 账户合约**  
     * 定义 validateUserOp 函数，用于验证 BLS 聚合签名。  
     * 定义 execute 函数，用于执行用户请求的交易。  
  2. **合约工厂**  
     * 使用 OpenZeppelin 提供的 Create2 工厂合约，实现 AA 账户的确定性部署。  
  3. **EntryPoint 合约**  
     * 使用 ERC-4337 标准的 EntryPoint 合约，接收和处理 UserOperation。  
     * 验证 Paymaster 支付 Gas 费用的有效性。  
     * 调用 AA 账户合约的 validateUserOp 函数验证签名。  
     * 调用 AA 账户合约的 execute 函数执行交易。

## **4\. 部署方案**

1. **智能合约部署**  
   * 使用 Foundry 将智能合约部署到以太坊测试网（如 Sepolia）或主网。  
   * 记录部署后的合约地址和 ABI，供后端模块使用。  
2. **后端部署**  
   * 将后端代码打包成 Docker 镜像。  
   * 使用 Docker Compose 或 Kubernetes 部署后端服务。  
   * 配置环境变量，包括数据库连接字符串、Web3 提供商 URL、BLS 节点地址等。  
3. **BLS 节点部署**  
   * 将 BLS 节点代码打包成 Docker 镜像。  
   * 使用 Docker Compose 或 Kubernetes 部署 BLS 节点服务。  
   * 配置环境变量，包括后端 API 地址、BLS 私钥等。  
4. **前端部署**  
   * 将前端代码打包成静态资源。  
   * 使用 Nginx 或 Apache 等 Web 服务器部署前端页面。  
   * 配置 API 代理，将前端请求转发到后端服务。

## **5\. 安全考虑**

* **Passkey 安全**  
  * Passkey 私钥存储在用户设备本地，受到设备安全机制保护。  
  * 后端对 Passkey 公钥进行加密存储，防止泄露。  
* **BLS 签名安全**  
  * BLS 签名算法具有抗多重签名攻击的特性。  
  * 通过多方签名验证，防止单点作恶。  
* **智能合约安全**  
  * 使用 OpenZeppelin 等安全合约库，避免常见漏洞。  
  * 对合约代码进行全面的安全审计，确保代码质量。  
* **后端安全**  
  * 对用户输入进行严格的验证和过滤，防止 SQL 注入、XSS 等攻击。  
  * 使用 HTTPS 协议进行通信，保证数据传输的安全性。  
  * 实施访问控制策略，限制未授权访问。

## **6\. 未来展望**

* **更多身份验证方式**：未来可以支持更多身份验证方式，例如生物识别、社交登录等，进一步提升用户体验。  
* **更灵活的交易策略**：支持用户自定义更复杂的交易逻辑，例如定时交易、条件交易等。  
* **跨链互操作**：探索与其他区块链网络的互操作性，实现跨链资产转移和交易。  
* **去中心化治理**：引入 DAO 等去中心化治理机制，实现社区自治。

## **7\. 总结**

AAStar 项目旨在通过账户抽象技术，打造更安全、更易用、更灵活的以太坊交易体验。项目采用模块化设计，技术选型成熟可靠，并充分考虑了安全性、可扩展性和未来发展。我们相信，AAStar 项目将为以太坊生态的发展做出积极贡献，并推动区块链技术的大规模应用。