import { TextField } from './TextField';

/**
 * 시각 한 칸. `09:30` 처럼 적는다.
 *
 * **네이티브 시간 피커를 쓰지 않는다.** `SelectSheet`가 같은 이유로 목록 시트를 쓴다 —
 * iOS 휠과 안드로이드 시계는 모양이 서로 다르고 디자인 시스템(글꼴·색·행 높이)이
 * 닿지 않는다. 라이브러리도 더하지 않는다 (`CLAUDE.md` 7장).
 *
 * **목록에서 고르게 하지 않는 이유.** 30분·10분 단위 목록을 주면 `14:20`에 나간 사람이
 * 자기 시각을 적을 수 없다. 몇 분 단위로 끊는지는 문서에 없는 규칙이라 화면이 정하지
 * 않는다 (`CLAUDE.md` 3장). 종이 신청서도 시각 칸이 빈칸이다.
 *
 * `TextField` 위에 얹는다 — 테두리·글꼴·오류 표기가 다른 입력칸과 같아야 하고,
 * 시스템 글꼴을 키워도 같이 늘어난다.
 */
interface Props {
  label: string;
  /** `HH:mm`. 아직 다 안 적었으면 그만큼만 들어 있다 */
  value: string;
  onChangeText: (value: string) => void;
}

export function TimeField({ label, value, onChangeText }: Props) {
  // 다 적기 전에는 나무라지 않는다. 네 자리를 다 적었는데 시각이 아닐 때만 알린다.
  const invalid = value.length === TIME_LENGTH && !isCompleteTime(value);

  return (
    <TextField
      label={label}
      value={value}
      onChangeText={(next) => onChangeText(maskTime(next))}
      placeholder="09:30"
      keyboardType="number-pad"
      maxLength={TIME_LENGTH}
      error={invalid ? '00:00 부터 23:59 사이로 적어주세요.' : undefined}
    />
  );
}

/** `09:30` 다섯 자 */
const TIME_LENGTH = 5;

/**
 * 숫자만 남기고 `HH:mm` 모양으로 되돌린다. `0930` → `09:30`.
 * 지울 때도 같은 길을 지나므로 콜론이 남아 걸리지 않는다.
 */
function maskTime(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/** 다 적었고 실제로 있는 시각인가. 시작이 끝보다 늦은지는 **서버가 본다** */
export function isCompleteTime(value: string): boolean {
  const matched = /^(\d{2}):(\d{2})$/.exec(value);
  if (!matched) return false;
  return Number(matched[1]) <= 23 && Number(matched[2]) <= 59;
}

/** 서버가 돌려주는 것과 같은 `HH:mm:ss` 로. 초는 화면에서 받지 않는다 */
export function toServerTime(value: string): string {
  return `${value}:00`;
}
