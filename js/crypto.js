class GameCrypto {
    static async decrypt(encryptedText) {
        try {
            // 使用固定的密钥和IV
            const key = new TextEncoder().encode('consmkey');
            const iv = new Uint8Array([18, 52, 86, 120, 144, 171, 205, 239]);

            // 使用PBKDF2生成适当长度的密钥
            const importedKey = await crypto.subtle.importKey(
                'raw',
                key,
                { name: 'PBKDF2' },
                false,
                ['deriveBits']
            );

            const derivedKey = await crypto.subtle.deriveBits(
                {
                    name: 'PBKDF2',
                    salt: new Uint8Array(8),  // 空盐值
                    iterations: 1000,
                    hash: 'SHA-256'
                },
                importedKey,
                256  // 生成256位密钥
            );

            // 导入派生的密钥用于AES-CBC
            const aesKey = await crypto.subtle.importKey(
                'raw',
                derivedKey,
                { name: 'AES-CBC' },
                false,
                ['decrypt']
            );

            // Base64解码
            const encryptedData = this.base64ToArrayBuffer(encryptedText);

            // 使用16字节IV（填充剩余字节为0）
            const fullIv = new Uint8Array(16);
            fullIv.set(iv);

            // 解密
            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: 'AES-CBC',
                    iv: fullIv
                },
                aesKey,
                encryptedData
            );

            // 转换为文本
            return new TextDecoder().decode(decryptedData);
        } catch (error) {
            console.error('解密失败:', error);
            // 如果解密失败，尝试直接解码Base64
            try {
                return atob(encryptedText);
            } catch (e) {
                console.error('Base64解码也失败:', e);
                return encryptedText;
            }
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
            try {
                if (typeof TextDecoder !== 'undefined') {
                    try {
                        // 首先尝试使用GBK
                        return new TextDecoder('gbk').decode(result);
                    } catch (e) {
                        // 如果GBK不可用，尝试使用GB18030（GBK的超集）
                        return new TextDecoder('gb18030').decode(result);
                    }
                } else {
                    // 如果TextDecoder不可用，使用text-encoding polyfill
                    return new TextDecoder('gbk', { NONSTANDARD_allowLegacyEncoding: true }).decode(result);
                }
            } catch (e) {
                console.warn('GBK解码失败，回退到UTF-8:', e);
                return new TextDecoder('utf-8').decode(result);
            }
        } catch (error) {
            console.error('INI解密失败:', error);
            return encryptedData;
        }
    }

    static parseIni(content) {
        const result = {};
        let currentSection = '';

        // 按行分割，同时处理不同的换行符
        const lines = content.split(/\r?\n/);

        for (const line of lines) {
            const trimmedLine = line.trim();

            // 跳过空行和注释
            if (!trimmedLine || trimmedLine.startsWith(';')) continue;

            // 检查是否是节名
            const sectionMatch = trimmedLine.match(/^\[(.*?)\]$/);
            if (sectionMatch) {
                currentSection = sectionMatch[1].trim();
                result[currentSection] = {};
                continue;
            }

            // 解析键值对
            if (currentSection) {
                const keyValueMatch = trimmedLine.match(/^([^=]+?)=(.*)$/);
                if (keyValueMatch) {
                    const key = keyValueMatch[1].trim();
                    const value = keyValueMatch[2].trim();
                    result[currentSection][key] = value;
                }
            }
        }

        return result;
    }
} 