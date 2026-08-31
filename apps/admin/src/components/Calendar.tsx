import type { ReactNode } from 'react';
import { addMonth, isInMonth, monthGridDates, monthTitle, todayInKst } from '@/lib/datetime';
import { Button } from './Button';
import './Calendar.css';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface Props {
  /** 보고 있는 달. `yyyy-MM` */
  month: string;
  onChangeMonth: (month: string) => void;
  /** 칸 안에 그릴 것. 서버가 준 값을 화면이 그린다 */
  renderDay: (isoDate: string) => ReactNode;
  /** 날짜 옆 보조 표시 — 공휴일 이름처럼 그 날이 무슨 날인지 */
  noteOf?: (isoDate: string) => string | undefined;
  isPending?: boolean;
  error?: Error | null;
  /** 이 격자를 거르는 것들. 표의 도구줄과 같은 자리다 */
  toolbar?: ReactNode;
}

/**
 * 한 달 격자.
 *
 * **날짜만 안다.** 무엇을 그릴지는 화면이 정한다 — 이 컴포넌트는 연차도 근태도 모른다.
 * 모바일의 `Calendar`와 같은 자리에 있지만 하는 일이 다르다. 그쪽은 본인 하루에 점 하나를
 * 찍고 날짜를 고르는 입력칸이고, 이쪽은 **여러 사람의 이름을 칸에 늘어놓는 읽는 격자**다.
 * React Native라 코드를 나눠 쓸 수도 없다.
 *
 * **로딩·오류에도 격자를 지우지 않는다.** 달력은 서버 응답이 없어도 그 달의 모양 자체가
 * 정보다. 표에서 열 머리를 남겨두는 것과 같은 이유다 (`DESIGN_ADMIN.md` 3장).
 *
 * **빈 상태를 두지 않는다.** 아무도 안 쉬는 달은 정상이고, 그때 격자가 비어 있는 것이
 * 이미 답이다.
 */
export function Calendar({
  month,
  onChangeMonth,
  renderDay,
  noteOf,
  isPending,
  error,
  toolbar,
}: Props) {
  const dates = monthGridDates(month);
  const today = todayInKst();

  return (
    <div className="calendar-box">
      <div className="calendar-toolbar">
        <div className="calendar-month">
          <Button
            label="이전 달"
            variant="secondary"
            onClick={() => onChangeMonth(addMonth(month, -1))}
          />
          <span className="calendar-month-title">{monthTitle(month)}</span>
          <Button
            label="다음 달"
            variant="secondary"
            onClick={() => onChangeMonth(addMonth(month, 1))}
          />
        </div>
        {toolbar}
      </div>

      {isPending ? (
        <p className="calendar-message">불러오는 중이에요.</p>
      ) : error ? (
        // 서버가 준 문구를 그대로. 앱에서 문구를 만들지 않는다.
        <p className="calendar-message danger">{error.message}</p>
      ) : null}

      <div className="calendar-grid">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="calendar-weekday">
            {weekday}
          </div>
        ))}

        {dates.map((date, index) => {
          const outside = !isInMonth(date, month);

          return (
            <div
              key={date}
              className={cellClass({ outside, sunday: index % 7 === 0, today: date === today })}
            >
              {/* 다른 달 날짜는 숫자도 내용도 그리지 않는다. 칸은 남으므로 격자는 어긋나지 않는다. */}
              {outside ? null : (
                <>
                  <span className="calendar-day">{Number(date.slice(8))}</span>
                  {noteOf?.(date) && <span className="calendar-note">{noteOf(date)}</span>}
                  {renderDay(date)}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function cellClass({
  outside,
  sunday,
  today,
}: {
  outside: boolean;
  sunday: boolean;
  today: boolean;
}): string {
  return [
    'calendar-cell',
    outside ? 'is-outside' : '',
    sunday ? 'is-sunday' : '',
    today ? 'calendar-today' : '',
  ]
    .filter(Boolean)
    .join(' ');
}
