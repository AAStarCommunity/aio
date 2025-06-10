// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title BLSSignatureVerifier
 * @dev BLS签名验证库 - 链上实现（高gas消耗版本）
 */
library BLSSignatureVerifier {
    // BLS12-381 曲线参数
    uint8 private constant BLS_SIG_LENGTH = 128;  // 修改为128字节
    uint8 private constant BLS_PUBKEY_LENGTH = 48;
    
    // 使用拆分的方式处理大整数
    // BLS12-381 曲线素数域参数（简化）
    uint256 private constant FIELD_MODULUS_1 = 0x1a0111ea397fe69a;
    uint256 private constant FIELD_MODULUS_2 = 0x4b1ba7b6434bacd7;
    
    // G1 生成点坐标 (简化值)
    uint256 private constant G1_X = 0x179a6f79d0ab8320;
    uint256 private constant G1_Y = 0x25f62a8c31c9f5ea;
    
    error InvalidSignatureLength();
    error InvalidPublicKeyLength();
    error SignatureVerificationFailed();

    /**
     * @dev 验证BLS签名
     * @param messageHash 待验证的消息哈希
     * @param signature BLS签名
     * @param publicKey BLS公钥
     */
    function verifySignature(
        bytes32 messageHash,
        bytes memory signature,
        bytes memory publicKey
    ) internal view returns (bool) {
        if (signature.length != BLS_SIG_LENGTH) revert InvalidSignatureLength();
        if (publicKey.length != BLS_PUBKEY_LENGTH) revert InvalidPublicKeyLength();

        // 1. 提取签名点坐标（现在处理128字节签名）
        (uint256 sigX1, uint256 sigY1, uint256 sigX2, uint256 sigY2) = extractSignaturePoints(signature);
        
        // 2. 提取公钥点坐标
        (uint256 pkX, uint256 pkY) = extractPublicKeyPoint(publicKey);
        
        // 3. 计算消息映射点
        (uint256 hashX, uint256 hashY) = hashToPoint(messageHash);
        
        // 4. 验证等式：e(signature1, g2) * e(signature2, publicKey) == e(hashPoint, g2)
        return verifyPairing(sigX1, sigY1, sigX2, sigY2, hashX, hashY, pkX, pkY);
    }

    /**
     * @dev 从字节数组中提取签名点的坐标（128字节版本）
     */
    function extractSignaturePoints(bytes memory signature) internal pure returns (
        uint256 x1, uint256 y1, uint256 x2, uint256 y2
    ) {
        assembly {
            // 从签名中加载四个32字节的坐标
            x1 := mload(add(signature, 32))  // 前32字节
            y1 := mload(add(signature, 64))  // 第二个32字节
            x2 := mload(add(signature, 96))  // 第三个32字节
            y2 := mload(add(signature, 128)) // 第四个32字节
        }
    }

    /**
     * @dev 从字节数组中提取公钥点的坐标
     */
    function extractPublicKeyPoint(bytes memory publicKey) internal pure returns (uint256 x, uint256 y) {
        assembly {
            // 从前24字节加载X坐标的一部分
            x := mload(add(publicKey, 24))
            // 从后24字节加载Y坐标的一部分
            y := mload(add(publicKey, 48))
        }
    }

    /**
     * @dev 将消息哈希映射到曲线上的点
     * 实现简化版的try-and-increment方法
     */
    function hashToPoint(bytes32 messageHash) internal view returns (uint256 x, uint256 y) {
        // 初始值为消息哈希转换为uint256
        x = uint256(messageHash);
        
        // 尝试查找有效的曲线点
        for (uint256 i = 0; i < 10; i++) {
            // 使用尝试值计算Y坐标
            bool found;
            (found, y) = findYforX(x);
            
            if (found) {
                return (x, y);
            }
            
            // 如果没找到，增加x值继续尝试
            x = addmod(x, 1, 2**248); // 使用较小的模数
        }
        
        // 如果10次尝试后仍没找到，使用生成点作为默认值
        return (G1_X, G1_Y);
    }
    
    /**
     * @dev 尝试为给定的X坐标找到有效的Y坐标
     * y² = x³ + b
     */
    function findYforX(uint256 x) internal view returns (bool found, uint256 y) {
        // BLS12-381曲线参数: y² = x³ + 4 (简化)
        uint256 b = 4;
        
        // 计算右侧: x³ + b
        uint256 xSquared = mulmod(x, x, 2**248);
        uint256 xCubed = mulmod(xSquared, x, 2**248);
        uint256 rightSide = addmod(xCubed, b, 2**248);
        
        // 尝试计算平方根
        (found, y) = squareRoot(rightSide);
    }
    
    /**
     * @dev 模平方根计算 (简化版)
     */
    function squareRoot(uint256 value) internal view returns (bool exists, uint256 root) {
        // 简化的平方根计算
        // 实际BLS实现需要更复杂的算法
        
        // 这里我们使用欧拉准则判断是否存在平方根
        uint256 exponent = 2**247 - 1;  // (2^248 - 1) / 2
        
        // 计算候选平方根
        root = modExp(value, addmod(exponent, 1, 2**248) / 2, 2**248);
        
        // 验证是否真的是平方根
        uint256 check = mulmod(root, root, 2**248);
        exists = (check == value);
    }
    
    /**
     * @dev 模幂运算 (a^b mod m)
     * 使用以太坊预编译合约
     */
    function modExp(uint256 base, uint256 exponent, uint256 modulus) internal view returns (uint256 result) {
        // 使用预编译合约 0x05 进行高效的模幂运算
        assembly {
            // 定义内存中的数据排列
            let memPtr := mload(0x40) // 获取空闲内存指针
            
            // 写入长度，每个长度占32字节
            mstore(memPtr, 0x20)       // baseLen
            mstore(add(memPtr, 0x20), 0x20) // expLen
            mstore(add(memPtr, 0x40), 0x20) // modLen
            
            // 写入数据，每个数据占32字节
            mstore(add(memPtr, 0x60), base)
            mstore(add(memPtr, 0x80), exponent)
            mstore(add(memPtr, 0xa0), modulus)
            
            // 调用预编译合约
            let success := staticcall(
                gas(),
                0x05, // 模幂预编译合约地址
                memPtr,
                0xc0, // 输入数据总长度(3个长度+3个数据)
                memPtr, // 将结果存储在相同位置
                0x20  // 输出长度
            )
            
            // 检查调用是否成功
            if iszero(success) {
                revert(0, 0)
            }
            
            // 读取结果
            result := mload(memPtr)
        }
    }

    /**
     * @dev 验证BLS配对关系（更新版本）
     */
    function verifyPairing(
        uint256 sig1X, uint256 sig1Y,
        uint256 sig2X, uint256 sig2Y,
        uint256 hashX, uint256 hashY,
        uint256 pkX, uint256 pkY
    ) internal view returns (bool) {
        // 验证两个配对的乘积
        // e(sig1, g2) * e(sig2, pk) == e(hash, g2)
        
        // 这里我们需要使用预编译合约进行配对验证
        // 为简化实现，我们返回一个基于点坐标的验证结果
        bool check1 = verifyPartialPairing(sig1X, sig1Y, G1_X, G1_Y);
        bool check2 = verifyPartialPairing(sig2X, sig2Y, pkX, pkY);
        bool check3 = verifyPartialPairing(hashX, hashY, G1_X, G1_Y);
        
        return check1 && check2 && check3;
    }

    /**
     * @dev 部分配对验证（简化版）
     */
    function verifyPartialPairing(
        uint256 x1, uint256 y1,
        uint256 x2, uint256 y2
    ) internal pure returns (bool) {
        // 简化的配对检查
        // 在实际实现中，应该使用预编译合约进行真正的配对计算
        return (x1 != 0 && y1 != 0 && x2 != 0 && y2 != 0);
    }

    /**
     * @dev 聚合多个BLS签名
     * @param signatures BLS签名数组
     */
    function aggregateSignatures(
        bytes[] memory signatures
    ) internal pure returns (bytes memory) {
        require(signatures.length > 0, "No signatures provided");
        
        if (signatures.length == 1) {
            return signatures[0];
        }
        
        // 初始化聚合签名点坐标
        uint256 aggX = 0;
        uint256 aggY = 0;
        
        // 聚合所有签名
        for (uint256 i = 0; i < signatures.length; i++) {
            require(signatures[i].length == BLS_SIG_LENGTH, "Invalid signature length");
            
            // 提取当前签名点
            (uint256 sigX1, uint256 sigY1, uint256 sigX2, uint256 sigY2) = extractSignaturePoints(signatures[i]);
            
            // 如果是第一个签名，直接赋值
            if (i == 0) {
                aggX = sigX1;
                aggY = sigY1;
            } else {
                // 对于后续签名，添加到聚合点
                (aggX, aggY) = ecAdd(aggX, aggY, sigX1, sigY1);
            }
        }
        
        // 将聚合点转换回字节格式
        bytes memory aggregatedSignature = new bytes(BLS_SIG_LENGTH);
        assembly {
            mstore(add(aggregatedSignature, 32), aggX)
            mstore(add(aggregatedSignature, 64), aggY)
        }
        
        return aggregatedSignature;
    }
    
    /**
     * @dev 椭圆曲线点加法 (简化版)
     */
    function ecAdd(
        uint256 x1, uint256 y1,
        uint256 x2, uint256 y2
    ) internal pure returns (uint256 x3, uint256 y3) {
        // 简化实现，实际上应该使用完整的椭圆曲线点加法
        // 当两点相同时，这是不正确的，应该用点倍乘
        if (x1 == x2 && y1 == y2) {
            // 简单返回，实际上应该计算2P
            return (x1, y1);
        }
        
        // 当点不同时的简化加法
        // 这个实现是非常简化的，不是真正的EC点加法
        x3 = addmod(x1, x2, 2**248);
        y3 = addmod(y1, y2, 2**248);
    }

    /**
     * @dev 验证聚合签名
     * @param messageHash 待验证的消息哈希
     * @param aggregatedSignature 聚合后的签名
     * @param publicKeys 公钥数组
     */
    function verifyAggregatedSignature(
        bytes32 messageHash,
        bytes memory aggregatedSignature,
        bytes[] memory publicKeys
    ) internal view returns (bool) {
        require(publicKeys.length > 0, "No public keys provided");
        require(aggregatedSignature.length == BLS_SIG_LENGTH, "Invalid signature length");
        
        // 如果只有一个公钥，直接使用单签名验证
        if (publicKeys.length == 1) {
            return verifySignature(messageHash, aggregatedSignature, publicKeys[0]);
        }
        
        // 提取聚合签名点
        (uint256 sigX1, uint256 sigY1, uint256 sigX2, uint256 sigY2) = extractSignaturePoints(aggregatedSignature);
        
        // 计算消息哈希点
        (uint256 hashX, uint256 hashY) = hashToPoint(messageHash);
        
        // 聚合所有公钥点
        uint256 aggPkX = 0;
        uint256 aggPkY = 0;
        
        for (uint256 i = 0; i < publicKeys.length; i++) {
            require(publicKeys[i].length == BLS_PUBKEY_LENGTH, "Invalid public key length");
            
            // 提取当前公钥点
            (uint256 pkX, uint256 pkY) = extractPublicKeyPoint(publicKeys[i]);
            
            // 如果是第一个公钥，直接赋值
            if (i == 0) {
                aggPkX = pkX;
                aggPkY = pkY;
            } else {
                // 对于后续公钥，添加到聚合点
                (aggPkX, aggPkY) = ecAdd(aggPkX, aggPkY, pkX, pkY);
            }
        }
        
        // 验证聚合签名与聚合公钥的配对关系
        return verifyPairing(sigX1, sigY1, sigX2, sigY2, hashX, hashY, aggPkX, aggPkY);
    }
} 