const enc = new TextEncoder()
const dec = new TextDecoder()

const keyBase64 = "O2uDLsygRn4DfKbx1pONrjZqRW3PrH6ED9D6I0dLAFk=" // 32-byte hardcoded key (base64)
const ivLength = 12

function base64ToUint8(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(base64)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

function uint8ToBase64(uint8: Uint8Array): string {
  return btoa(String.fromCharCode(...uint8))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

async function getKey(): Promise<CryptoKey> {
  const rawKey = base64ToUint8(keyBase64)
  return crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])
}

export async function encrypt(text: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(ivLength))
  const key = await getKey()
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text))
  const result = new Uint8Array([...iv, ...new Uint8Array(encrypted)])
  return uint8ToBase64(result)
}

export async function decrypt(base64url: string): Promise<string> {
  const data = base64ToUint8(base64url)
  const iv = data.slice(0, ivLength)
  const encryptedData = data.slice(ivLength)
  const key = await getKey()
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encryptedData)
  return dec.decode(decrypted)
}
