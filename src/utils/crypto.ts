import { Bindings } from "../types";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export function encrypt(env: Bindings, input: string) {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-192-gcm", env.ENCRYPTED_PASS_KEY, iv);

  const encryptBlob = Buffer.concat([iv, cipher.update(input, 'utf-8'), cipher.final()]);
  return encryptBlob.toString('base64url');
}

export function decrypt(env: Bindings, input: string) {
  const blob = Buffer.from(input, 'base64url');
  const iv = blob.subarray(0, 16); // the original ivs
  const data = blob.subarray(16); // the encrypted string  
  const cipher = createDecipheriv("aes-192-gcm", env.ENCRYPTED_PASS_KEY, iv);

  const decrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return decrypted.toString('utf-8');
}