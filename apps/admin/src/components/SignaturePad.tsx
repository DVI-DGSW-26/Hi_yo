import { useEffect, useRef, useState } from 'react';
import './SignaturePad.css';

/**
 * 손으로 그리는 서명칸. 결재(`POST /requests/{id}/decision`)의 `IMAGE` 서명에 쓴다.
 *
 * **크기를 고정한다.** 캔버스 340×160 CSS px, 백킹스토어는 그 두 배(680×320)다.
 * 기기 배율(DPR)을 그대로 쓰면 DPR 3 화면에서 한 장이 수백 KB가 된다 —
 * 600×240 @3x 로 빽빽하게 그리면 204 KB 였다 (`docs/API_신청결재.md` 8장 실측).
 * 서명은 선 몇 획이라 2배로 충분하다.
 *
 * **서버에 보내는 것은 base64 문자열이다. data URL 이 아니다** (서버 답변 2026-08-31).
 * `data:image/png;base64,` 앞머리를 떼고 넘긴다.
 *
 * **배경을 칠하지 않는다(투명).** 흰 배경보다 10% 작고 문서에 얹을 때 유리해서 그렇게
 * 제안했는데, **서버 답을 아직 못 받았다** (같은 문서 8장 TODO). 흰색으로 정해지면
 * `emit` 에서 한 줄만 고치면 된다.
 *
 * 라이브러리를 쓰지 않는다 (`CLAUDE.md` 7장). `<canvas>` 와 포인터 이벤트로 충분하다.
 */

/** 서버에 제안한 상한. base64 기준 128 KB (`docs/API_신청결재.md` 8장) */
const MAX_BASE64_LENGTH = 128 * 1024;

const WIDTH = 340;
const HEIGHT = 160;
const SCALE = 2;

interface Props {
  label: string;
  /** base64. 비어 있으면 아직 그리지 않은 것이다 */
  value: string;
  onChange: (base64: string) => void;
}

export function SignaturePad({ label, value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [tooBig, setTooBig] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    /*
     * **`scale()` 이 아니라 `setTransform()` 이다.** `scale` 은 지금 값에 곱해서 쌓인다 —
     * `StrictMode` 가 개발 모드에서 효과를 두 번 부르므로 배율이 2가 아니라 4가 되고,
     * 그리면 획이 캔버스 밖으로 밀려난다 (2026-09-02에 그림을 보고 찾았다).
     * `setTransform` 은 몇 번을 불러도 같은 값이다.
     */
    context.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    // 색도 토큰에서 온다. CSS 변수를 읽어 쓴다 (hex 를 여기 적지 않는다)
    context.strokeStyle = getComputedStyle(canvas).getPropertyValue('--color-text-strong').trim();
  }, []);

  // 밖에서 값을 비우면(제출 뒤) 그림도 지운다
  useEffect(() => {
    if (value !== '') return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
  }, [value]);

  function pointOf(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
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

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    setTooBig(false);
    onChange('');
  }

  return (
    <div className="signature">
      <span className="signature-label">{label}</span>

      <canvas
        ref={canvasRef}
        className="signature-canvas"
        width={WIDTH * SCALE}
        height={HEIGHT * SCALE}
        aria-label={label}
        onPointerDown={(event) => {
          const context = event.currentTarget.getContext('2d');
          if (!context) return;
          // 캔버스 밖으로 손이 나가도 획이 이어진다
          event.currentTarget.setPointerCapture(event.pointerId);
          drawing.current = true;
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
          drawing.current = false;
          emit();
        }}
        onPointerCancel={() => {
          drawing.current = false;
        }}
      />

      <div className="signature-actions">
        {/*
          지우기는 서명이 있을 때만 쓸 일이 있다. 그래도 늘 둔다 —
          없다가 생기면 눌러야 할 때 못 찾는다 (`DESIGN_ADMIN.md` 1장 예외 규칙과 같은 결).
        */}
        <button type="button" className="signature-clear" onClick={clear}>
          다시 그리기
        </button>
        <span className="signature-note">
          {tooBig
            ? '서명이 너무 커요. 다시 그려주세요.'
            : value === ''
              ? '여기에 손으로 서명해요. 비워두면 누른 것으로 서명해요.'
              : '서명했어요.'}
        </span>
      </div>
    </div>
  );
}
