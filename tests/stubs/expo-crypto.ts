/**
 * `expo-crypto` 대역.
 *
 * **테스트하는 함수들은 이걸 쓰지 않는다.** `buildAuthorizeUrl` 은 이미 만들어진
 * challenge 를 받고, PKCE 한 쌍을 만드는 쪽은 기기 보안 난수라 노드에서 재현할 값이
 * 아니다. 같은 파일(`lib/auth.ts`)이 위에서 불러오기 때문에 **읽히게만 하는 것이 목적이다.**
 */
export enum CryptoDigestAlgorithm {
  SHA256 = 'SHA-256',
}

export enum CryptoEncoding {
  BASE64 = 'base64',
}

export function getRandomBytes(): Uint8Array {
  throw new Error('테스트에서 난수를 만들지 않는다');
}

export function digestStringAsync(): Promise<string> {
  throw new Error('테스트에서 해시를 만들지 않는다');
}
