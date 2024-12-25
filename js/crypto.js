class GameCrypto {
    static async decrypt(encryptedText) {
        const key = CryptoJS.enc.Utf8.parse('consmkey');
        const iv = CryptoJS.enc.Hex.parse('1234567890abcdef');

        const decrypted = CryptoJS.DES.decrypt(
            { ciphertext: CryptoJS.enc.Base64.parse(encryptedText) },
            key,
            {
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7,
                iv: iv
            }
        );

        return decrypted.toString(CryptoJS.enc.Utf8);
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
