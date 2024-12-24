class GameCrypto {
    static async decrypt(encryptedText) {
        try {
            // 使用指定的密钥并确保它是16字节（128位）
            const rawKey = 'consmkey'.padEnd(16, '\0');  // 填充到16字节
            const keyMaterial = new TextEncoder().encode(rawKey);

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
                    name: 'AES-CBC'  // 移除 length 参数，让系统自动从密钥材料推断
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
            // 对每个字节进行异或185操作
            const result = new Uint8Array(encryptedData.length);
            for (let i = 0; i < encryptedData.length; i++) {
                result[i] = encryptedData[i] ^ 185;
            }

            // 使用GBK解码
            // 注意：需要引入GBK解码库，因为JavaScript默认不支持GBK
            try {
                // 尝试使用TextDecoder的GBK支持（部分现代浏览器支持）
                const decoder = new TextDecoder('gbk');
                return decoder.decode(result);
            } catch (e) {
                console.warn('浏览器不支持GBK解码，将回退到UTF-8');
                // 如果浏览器不支持GBK，回退到UTF-8
                return new TextDecoder('utf-8').decode(result);
            }
        } catch (error) {
            console.error('INI解密失败:', error);
            return encryptedData;
        }
    }

    // 添加一个解析INI内容的辅助方法
    static parseIni(content) {
        const result = {};
        let currentSection = '';

        // 按行分割
        const lines = content.split(/\r?\n/);

        for (const line of lines) {
            const trimmedLine = line.trim();

            // 跳过空行和注释
            if (!trimmedLine || trimmedLine.startsWith(';')) continue;

            // 检查是否是节名
            const sectionMatch = trimmedLine.match(/^\[(.*)\]$/);
            if (sectionMatch) {
                currentSection = sectionMatch[1];
                result[currentSection] = {};
                continue;
            }

            // 解析键值对
            const keyValueMatch = trimmedLine.match(/^([^=]+)=(.*)$/);
            if (keyValueMatch && currentSection) {
                const key = keyValueMatch[1].trim();
                const value = keyValueMatch[2].trim();
                result[currentSection][key] = value;
            }
        }

        return result;
    }
} 