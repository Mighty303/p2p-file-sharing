const { subtle } = globalThis.crypto;

async function generateKeyPair(length = 256) {
    const keyPair = await subtle.generateKey({
        name: 'AES-GCM',
        length: length,
    }, true, ['encrypt', 'decrypt']);
    
    return keyPair;
}

async function encryptMessage(key: CryptoKey, message: string) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(message);
    const ciphertext = await subtle.encrypt({
        name: 'AES-GCM',
        iv: iv,
    }, key, encoded);
    return {
        iv: Array.from(iv),
        ciphertext: Array.from(new Uint8Array(ciphertext)),
    };
}

async function decryptMessage(key: CryptoKey, iv: number[], ciphertext: number[]) {
    const decrypted = await subtle.decrypt({
        name: 'AES-GCM',
        iv: new Uint8Array(iv),
    }, key, new Uint8Array(ciphertext));
    return new TextDecoder().decode(decrypted);
}

export { generateKeyPair, encryptMessage, decryptMessage };