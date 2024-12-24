class GameCrypto {
    static async decrypt(encryptedText) {
        try {
            // 使用指定的密钥
            const keyMaterial = new TextEncoder().encode('consmkey');

            // 使用固定的 IV
            const iv = new Uint8Array([18, 52, 86, 120, 144, 171, 205, 239]);

            // 由于原始IV是8字节，需要扩展到16字节（AES-CBC要求）
            const fullIv = new Uint8Array(16);
            fullIv.set(iv);  // 填充剩余字节为0

            // 使用 AES-CBC 算法
            const key = await crypto.subtle.importKey(
                'raw',
                keyMaterial,
                {
                    name: 'AES-CBC',
                    length: 128  // 改为128位密钥长度
                },
                false,
                ['decrypt']
            );

            // Base64 解码
            const encryptedData = this.base64ToArrayBuffer(encryptedText);

            // 解密
            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: 'AES-CBC',
                    iv: fullIv
                },
                key,
                encryptedData
            );

            // 转换为文本
            return new TextDecoder().decode(decryptedData);
        } catch (error) {
            console.error('解密失败:', error);
            return encryptedText; // 如果解密失败，返回原文
        }
    }

    static base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    static decryptIni(encryptedData) {
        try {
            // 简单的XOR解密示例
            const key = new TextEncoder().encode('consmkey');
            const result = new Uint8Array(encryptedData.length);

            for (let i = 0; i < encryptedData.length; i++) {
                result[i] = encryptedData[i] ^ key[i % key.length];
            }

            return result;
        } catch (error) {
            console.error('INI解密失败:', error);
            return encryptedData;
        }
    }
} 