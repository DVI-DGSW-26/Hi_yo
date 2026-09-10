import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@hr/tokens';
import { Button } from './Button';

/**
 * 손으로 그리는 서명칸 — **웹**.
 *
 * `SignaturePad.tsx` 의 웹판이다. Metro 가 웹 번들에서만 이 파일을 고른다(`.web.tsx`).
 *
 * 앱판은 `react-native-webview` 안에 `<canvas>` 를 띄운다 — React Native 에 캔버스가
 * 없어서다(`docs/02_모바일_서명_라이브러리.md`). **웹에는 캔버스가 그냥 있다.**
 * 그래서 WebView 를 걷어내고 같은 그리기 코드를 그대로 쓴다. 껍데기(테두리·라벨·
 * 다시 그리기·문구)는 앱판과 똑같이 두어 두 화면이 같아 보이게 한다.
 *
 * **서버로 나가는 값은 앱판·관리팀판과 한 글자도 다르면 안 된다.** 셋이 같은
 * 엔드포인트에 같은 형식으로 보낸다 (`docs/API_신청결재.md` 8장).
 * - 백킹스토어는 **CSS 폭의 두 배** 고정. 기기 배율(DPR)을 그대로 쓰지 않는다
 * - **base64 문자열**이다. `data:image/png;base64,` 앞머리를 뗀다
 * - **128 KB 를 넘으면 보내지 않고** 다시 그리라고 한다 (서버 상한과 같은 값)
 * - 배경은 **투명**이다 — 서명이 출력 서식 위에 얹힌다
 */

/** 서버 상한. base64 기준 128 KB */
const MAX_BASE64_LENGTH = 128 * 1024;

/** 캔버스 높이(CSS px). 폭은 화면에 맞추되 340 을 넘기지 않는다 */
const HEIGHT = 160;
const MAX_WIDTH = 340;
const SCALE = 2;

interface Props {
  label: string;
  /** base64. 비어 있으면 아직 그리지 않은 것이다 */
  value: string;
  onChange: (base64: string) => void;
  /**
   * 그리는 중인지. 앱판은 이걸로 ScrollView 를 끈다(실기기에서 안 끄면 안 그려진다).
   * **웹은 `touch-action: none` 이 같은 일을 해서 쓸 데가 없지만, 부르는 쪽을
   * 갈라놓지 않으려고 받아만 두고 그대로 알려준다.**
   */
  onDrawingChange?: (drawing: boolean) => void;
}

export function SignaturePad({ label, value, onChange, onDrawingChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [tooBig, setTooBig] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    // 백킹스토어는 CSS 폭의 두 배로 고정한다. 앱판과 같은 계산이다.
    const cssWidth = Math.min(canvas.clientWidth || MAX_WIDTH, MAX_WIDTH);
    canvas.width = cssWidth * SCALE;
    canvas.height = HEIGHT * SCALE;

    /*
     * **`scale()` 이 아니라 `setTransform()` 이다.** `scale` 은 지금 값에 곱해서 쌓인다 —
     * `StrictMode` 가 개발 모드에서 효과를 두 번 부르면 배율이 4가 되어 획이 밖으로
     * 밀려난다 (관리팀판에서 2026-09-02에 그림을 보고 찾았다).
     */
    context.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = colors.textStrong;
  }, []);

  // 밖에서 값을 비우면(제출 뒤) 그림도 지운다
  useEffect(() => {
    if (value !== '') return;
    clearCanvas();
  }, [value]);

  function clearCanvas() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  function pointOf(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function setDrawing(next: boolean) {
    drawing.current = next;
    onDrawingChange?.(next);
  }

  function emit() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // data URL 의 앞머리를 뗀다. 서버가 받는 것은 base64 문자열이다
    const base64 = canvas.toDataURL('image/png').split(',')[1] ?? '';
    if (base64.length > MAX_BASE64_LENGTH) {
      setTooBig(true);
      return;
    }
    setTooBig(false);
    onChange(base64);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.canvas}>
        <canvas
          ref={canvasRef}
          aria-label={label}
          /*
           * `touch-action: none` 이 앱판의 `scrollEnabled={false}` 자리다.
           * 없으면 손가락을 움직일 때 페이지가 따라 스크롤되어 획이 끊긴다.
           */
          style={{ display: 'block', width: '100%', height: HEIGHT, touchAction: 'none' }}
          onPointerDown={(event) => {
            const context = event.currentTarget.getContext('2d');
            if (!context) return;
            // 캔버스 밖으로 손이 나가도 획이 이어진다
            event.currentTarget.setPointerCapture(event.pointerId);
            setDrawing(true);
            const point = pointOf(event);
            context.beginPath();
            context.moveTo(point.x, point.y);
          }}
          onPointerMove={(event) => {
            if (!drawing.current) return;
            const context = event.currentTarget.getContext('2d');
            if (!context) return;
            const point = pointOf(event);
            context.lineTo(point.x, point.y);
            context.stroke();
          }}
          onPointerUp={() => {
            if (!drawing.current) return;
            setDrawing(false);
            emit();
          }}
          onPointerCancel={() => setDrawing(false)}
        />
      </View>

      <View style={styles.actions}>
        <Button
          label="다시 그리기"
          variant="secondary"
          size="inline"
          onPress={() => {
            clearCanvas();
            setTooBig(false);
            onChange('');
          }}
        />
        <Text style={styles.note}>
          {tooBig
            ? '서명이 너무 커요. 다시 그려주세요.'
            : value === ''
              ? '여기에 손으로 서명해요.'
              : '서명했어요.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.tight },
  label: { ...typography.label, color: colors.textWeak },
  /*
   * 높이를 고정한다. 이 안은 그림이라 글꼴을 키워도 커질 것이 없다 —
   * 대신 폭은 화면에 맞춘다 (`DESIGN_RULES.md` 4장). 앱판과 같은 값이다.
   */
  canvas: {
    height: HEIGHT,
    maxWidth: MAX_WIDTH,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.chip,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.rowGap },
  note: { ...typography.label, color: colors.textWeak, flexShrink: 1 },
});
