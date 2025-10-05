const { subtle } = globalThis.crypto;

async function generateKeyPair(length = 256) {
    const keyPair = await subtle.generateKey({
        name: 'AES-GCM',
        length: length,
    }, true, ['encrypt', 'decrypt']);
    
    return keyPair;
}

async function encryptMessage(key: CryptoKey, message: string) {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);     // fill with random bytes

  const encoded = new TextEncoder().encode(message);

  const ciphertextBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return {
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(ciphertextBuffer)),
  };
}

async function decryptMessage(key: CryptoKey, iv: Uint8Array, ciphertext: Uint8Array) {
    const decrypted = await subtle.decrypt({
        name: 'AES-GCM',
        iv: new Uint8Array(iv),
    }, key, new Uint8Array(ciphertext));
    return new TextDecoder().decode(decrypted);
}

async function encryptFile(key: CryptoKey, file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const ciphertextBuffer = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    arrayBuffer
  );

  // Convert to base64 instead of arrays
  const ivBase64 = btoa(String.fromCharCode(...iv));
  const ciphertextBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer)));

  return {
    iv: ivBase64,
    ciphertext: ciphertextBase64,
    fileName: file.name,
    fileType: file.type
  };
}

async function decryptFile(key: CryptoKey, iv: number[], ciphertext: number[], fileName: string, fileType: string) {
  const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    new Uint8Array(ciphertext)
  );

  return new File([decryptedBuffer], fileName, { type: fileType });
}


export { generateKeyPair, encryptMessage, decryptMessage, encryptFile, decryptFile };