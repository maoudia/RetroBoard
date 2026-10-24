/** Signature ports. Keys and signatures are base64url strings; adapters own the bytes. */
export interface SignerPort {
  /** Public key of this session (Ed25519, base64url). */
  readonly publicKey: string
  sign(message: string): Promise<string>
}

export interface VerifierPort {
  /** False for any malformed key, signature or mismatch. Never throws. */
  verify(publicKey: string, signature: string, message: string): Promise<boolean>
}
