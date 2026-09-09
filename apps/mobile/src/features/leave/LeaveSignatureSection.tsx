import { StyleSheet, Text } from 'react-native';
import { colors, typography } from '@hr/tokens';
import { SignaturePad } from '@/components';

/**
 * 신청인 서명 — 종이 서식의 「작성」 칸.
 *
 * 회사 「휴가(근태)신청서」(DV-MP-120-004)의 결재란이 「작성 · 검토 · 승인」 세 칸이고,
 * **작성이 신청인 자리다.** 2026-09-02부터 `POST /requests`가 이 값을 받는다.
 *
 * **`onDrawingChange` 를 반드시 위로 넘긴다.** 이 칸이 `ScrollView` 안에 있어서,
 * 손가락이 닿아 있는 동안 부모 스크롤을 끄지 않으면 안드로이드에서 그림이 그려지지
 * 않는다 (2026-09-09 실기기). 넘기지 않으면 서명이 안 되고 신청도 나가지 않는다.
 *
 * **서버에서는 선택이지만 화면에서는 필수로 받는다.** 서버가 필수로 두지 않은 것은
 * 관리팀이 대리 등록하는 경로가 있어서다 — 본인이 폰으로 내는 신청서는 종이와 같아야
 * 한다 (`docs/API_신청결재.md` 3장).
 */
export function LeaveSignatureSection({
  value,
  onChange,
  onDrawingChange,
}: {
  value: string;
  onChange: (base64: string) => void;
  onDrawingChange: (drawing: boolean) => void;
}) {
  return (
    <>
      <SignaturePad
        label="서명"
        value={value}
        onChange={onChange}
        onDrawingChange={onDrawingChange}
      />
      <Text style={styles.note}>종이 신청서의 신청인 칸이에요. 손가락으로 적어주세요.</Text>
    </>
  );
}

const styles = StyleSheet.create({
  note: { ...typography.label, color: colors.textWeak },
});
