/**
 * `expo-secure-store` 대역. **읽히게만 하는 것이 목적이다** — 토큰을 실제로 넣고 빼는
 * 것은 기기 보안 저장소가 하는 일이라 노드에서 확인할 것이 없다.
 *
 * 값을 돌려주지 않고 던진다. 테스트가 실수로 이걸 타면 조용히 통과하는 대신 터진다.
 */
function 쓰지않는다(): never {
  throw new Error('테스트에서 SecureStore 를 타면 안 된다');
}

export const getItemAsync = 쓰지않는다;
export const setItemAsync = 쓰지않는다;
export const deleteItemAsync = 쓰지않는다;
