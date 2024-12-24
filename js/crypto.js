class GameCrypto {
    static async decrypt(encryptedText) {
        const key = new TextEncoder().encode('consmkey');
        const iv = new Uint8Array([18, 52, 86, 120, 144, 171, 205, 239]);

        const encryptedData = this.base64ToArrayBuffer(encryptedText);

        const algorithm = {
            name: 'DES-CBC',
            iv: iv
        };

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            key,
            'DES-CBC',
            false,
            ['decrypt']
        );

        const decrypted = await crypto.subtle.decrypt(
            algorithm,
            cryptoKey,
            encryptedData
        );

        return new TextDecoder().decode(decrypted);
    }

    static base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }
} 