import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { colors, radius, spacing, typography } from '@hr/tokens';
import { Button } from './Button';

/**
 * 손으로 그리는 서명칸.
 *
 * **`WebView` 안의 `<canvas>` 다.** React Native 에는 캔버스가 없어서 그리는 것도,
 * 그린 것을 base64 PNG 로 굽는 것도 라이브러리가 있어야 한다. 후보 넷을 비교해
 * `react-native-webview` 하나로 정했다 (`docs/02_모바일_서명_라이브러리.md`, 2026-09-02).
 *
 * **관리팀 결재 화면의 `SignaturePad` 와 같은 규칙을 쓴다.** 두 앱이 서버에 같은 형식으로
 * 보내야 하고, 그 값은 이미 실측해 뒀다 (`docs/API_신청결재.md` 8장).
 *
 * - 백킹스토어를 **CSS 폭의 두 배**로 고정한다. 기기 배율(DPR 3)을 그대로 쓰면 한 장이
 *   수백 KB가 된다 — 600×240 @3x 로 빽빽하게 그리면 204 KB 였다
 * - 보내는 것은 **base64 문자열**이다. `data:image/png;base64,` 앞머리를 뗀다
 * - **base64 128 KB 를 넘으면 보내지 않고 다시 그리라고 한다.** 우리가 서버에 제안한
 *   상한이라, 다른 값으로 정해지면 두 앱에서 같이 고친다
 * - 배경은 **투명**이다. 서버 답이 흰색이면 여기와 관리팀 두 곳을 같이 고친다
 *
 * **아직 보낼 곳이 없다.** 신청서·계획서·단체연차 어디에도 서명 필드가 없다
 * (물어볼 것 12번). 경로가 열리면 이 값을 그대로 실어 보내면 된다.
 */

/** 서버에 제안한 상한. base64 기준 128 KB */
const MAX_BASE64_LENGTH = 128 * 1024;

/** 캔버스 높이(CSS px). 폭은 화면에 맞추되 340 을 넘기지 않는다 */
const HEIGHT = 160;
const MAX_WIDTH = 340;

interface Props {
  label: string;
  /** base64. 비어 있으면 아직 그리지 않은 것이다 */
  value: string;
  onChange: (base64: string) => void;
}

export function SignaturePad({ label, value, onChange }: Props) {
  const webRef = useRef<WebView>(null);
  const [tooBig, setTooBig] = useState(false);

  function handleMessage(event: WebViewMessageEvent) {
    const raw: unknown = JSON.parse(event.nativeEvent.data);
    if (typeof raw !== 'object' || raw === null) return;
    const message = raw as { type?: string; base64?: string };

    if (message.type === 'too-big') {
      setTooBig(true);
      return;
    }
    if (message.type === 'sign' && typeof message.base64 === 'string') {
      setTooBig(false);
      onChange(message.base64);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.canvas}>
        <WebView
          ref={webRef}
          source={{ html: PAD_HTML }}
          originWhitelist={['*']}
          onMessage={handleMessage}
          // 서명칸 안에서 손가락을 움직이면 그림이 그려져야 한다. 화면이 따라 움직이면 안 된다
          scrollEnabled={false}
          overScrollMode="never"
          // 뒤 배경이 비쳐야 상자 안이 흰 종이처럼 보인다
          style={styles.web}
          accessibilityLabel={label}
        />
      </View>

      <View style={styles.actions}>
        <Button
          label="다시 그리기"
          variant="secondary"
          size="inline"
          onPress={() => {
            webRef.current?.injectJavaScript('window.__clear();true;');
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

/*
 * 캔버스와 그리기는 이 HTML 안에 있다. 색은 토큰에서 넣는다 —
 * 여기에 hex 를 직접 적지 않는다 (`DESIGN_RULES.md` 1장 1번).
 */
const PAD_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  /* 손가락을 움직여도 화면이 따라 움직이지 않는다 */
  canvas { display: block; width: 100%; height: ${HEIGHT}px; touch-action: none; }
</style>
</head>
<body>
<canvas id="pad"></canvas>
<script>
  var canvas = document.getElementById('pad');
  var ctx = canvas.getContext('2d');
  var drawing = false;

  // 백킹스토어는 CSS 폭의 두 배로 고정한다. 기기 배율을 그대로 쓰지 않는다.
  var cssWidth = Math.min(canvas.clientWidth, ${MAX_WIDTH});
  canvas.width = cssWidth * 2;
  canvas.height = ${HEIGHT} * 2;
  // scale 은 곱해서 쌓인다. 몇 번 불려도 같은 값이 되도록 setTransform 을 쓴다.
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '${colors.textStrong}';

  function post(message) {
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }

  function pointOf(event) {
    var rect = canvas.getBoundingClientRect();
    var touch = event.touches && event.touches[0] ? event.touches[0] : event;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  function start(event) {
    event.preventDefault();
    drawing = true;
    var p = pointOf(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(event) {
    if (!drawing) return;
    event.preventDefault();
    var p = pointOf(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function end() {
    if (!drawing) return;
    drawing = false;
    // data URL 의 앞머리를 뗀다. 서버가 받는 것은 base64 문자열이다.
    var base64 = canvas.toDataURL('image/png').split(',')[1] || '';
    if (base64.length > ${MAX_BASE64_LENGTH}) {
      post({ type: 'too-big' });
      return;
    }
    post({ type: 'sign', base64: base64 });
  }

  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', end);
  canvas.addEventListener('touchcancel', function () { drawing = false; });

  window.__clear = function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
</script>
</body>
</html>`;

const styles = StyleSheet.create({
  wrap: { gap: spacing.tight },
  label: { ...typography.label, color: colors.textWeak },
  /*
   * 높이를 고정한다. 이 안은 그림이라 글꼴을 키워도 커질 것이 없다 —
   * 대신 폭은 화면에 맞춘다 (`DESIGN_RULES.md` 4장).
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
  web: { backgroundColor: 'transparent' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.rowGap },
  note: { ...typography.label, color: colors.textWeak, flexShrink: 1 },
});
