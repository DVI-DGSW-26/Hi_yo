import { useMemo, useState } from 'react';
import { Calendar, Summary } from '@/components';
import { useHolidays } from '@/features/holidays/api';
import { useLeaveCalendarAll, type CalendarEntry } from '@/features/leave/api';
import { currentMonth, monthGridDates } from '@/lib/datetime';

/**
 * A-301 전 직원 연차 현황 (달력)
 *
 * 이 화면이 전달할 단 하나의 메시지 — **이 달 어느 날에 사람이 몰려 있는가.**
 *
 * 대장(A-303)이 한 사람의 한 해를 세로로 본다면, 이쪽은 하루를 가로로 본다.
 * 관리팀이 이 화면을 여는 이유는 잔여를 확인하려는 것이 아니라 **자리가 비는 날을 미리
 * 보려는 것**이다. 그래서 날짜 칸에 건수가 아니라 **이름**을 늘어놓는다 — 셋이 쉬는 날에
 * `3건`이라고만 적으면 그 셋이 같은 팀인지 알 수 없다.
 *
 * **차감 일수를 화면에서 세지 않는다.** 반차가 `0.5`로 오는 것도 서버 판정이다.
 * 주말·공휴일을 빼는 것도 서버가 한다 (`CLAUDE.md` 3장).
 *
 * **공휴일을 같이 깐다.** 아무도 안 쉬는 날이 공휴일이라서인지 그냥 빈 날인지 구분이
 * 안 되면 달력을 잘못 읽는다. 이미 있는 `useHolidays`를 그대로 부른다 — 새 API가 아니다.
 *
 * 조회만 하는 화면이라 primary 버튼이 없고 그린도 없다.
 */
export function LeaveCalendarPage() {
  const [month, setMonth] = useState(() => currentMonth());

  /*
   * 격자가 앞뒤 달까지 덮으므로 1일~말일이 아니라 격자의 처음과 끝을 넘긴다.
   * 그러지 않으면 첫 줄과 마지막 줄에 걸친 날이 비어 보인다.
   */
  const dates = useMemo(() => monthGridDates(month), [month]);
  const from = dates[0] ?? '';
  const to = dates[dates.length - 1] ?? '';

  const calendar = useLeaveCalendarAll(from, to);
  const holidays = useHolidays(Number(month.slice(0, 4)));

  const byDate = useMemo(() => groupByDate(calendar.data), [calendar.data]);
  const holidayNames = useMemo(() => nameByDate(holidays.data), [holidays.data]);

  /*
   * 보고 있는 달 안의 것만 센다. 격자 앞뒤에 걸린 다른 달 날짜까지 세면 요약이 달과
   * 어긋난다. 세는 것은 목록의 길이지 업무 계산이 아니다 (DESIGN_ADMIN.md 11장).
   */
  const inMonth = calendar.data?.filter((entry) => entry.date.startsWith(`${month}-`));

  return (
    <section className="page-blocks">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">연차 달력</h1>
          <p className="page-lead">
            전 직원이 언제 쉬는지 한 달씩 봐요. 공휴일도 같이 깔려요 — 아무도 안 쉬는 날이
            공휴일이라서인지 구분하려면 필요해요.
          </p>
        </div>
      </div>

      {inMonth && (
        <Summary
          items={[
            { label: '이 달 연차', value: `${inMonth.length}건` },
            { label: '쉬는 사람', value: `${countPeople(inMonth)}명` },
          ]}
        />
      )}

      <Calendar
        month={month}
        onChangeMonth={setMonth}
        isPending={calendar.isPending}
        error={calendar.error}
        noteOf={(date) => holidayNames.get(date)}
        renderDay={(date) => {
          const entries = byDate.get(date);
          if (!entries) return null;

          return (
            <div className="calendar-entries">
              {entries.map((entry) => (
                <span
                  key={entry.requestId}
                  className="calendar-entry"
                  title={`${entry.employeeName ?? `직원 ${entry.employeeId}`} · ${entry.typeName ?? entry.typeCode}`}
                >
                  <span className="calendar-entry-name">
                    {entry.employeeName ?? `직원 ${entry.employeeId}`}
                  </span>
                  {/* 표시명은 서버가 준다. 코드로 이름을 만들지 않는다. */}
                  <span className="calendar-entry-kind">{entry.typeName ?? entry.typeCode}</span>
                </span>
              ))}
            </div>
          );
        }}
      />
    </section>
  );
}

/** 날짜별로 묶는다. 서버가 준 순서를 그대로 둔다 — 화면에서 다시 정렬하지 않는다. */
function groupByDate(entries: CalendarEntry[] | undefined): Map<string, CalendarEntry[]> {
  const map = new Map<string, CalendarEntry[]>();
  if (!entries) return map;

  for (const entry of entries) {
    const day = map.get(entry.date);
    if (day) day.push(entry);
    else map.set(entry.date, [entry]);
  }
  return map;
}

function nameByDate(holidays: { holidayDate: string; name: string }[] | undefined) {
  return new Map(holidays?.map((holiday) => [holiday.holidayDate, holiday.name]));
}

/** 며칠을 쉬든 한 사람은 한 명이다. 사람 수를 세는 것이지 일수를 더하는 것이 아니다. */
function countPeople(entries: CalendarEntry[]): number {
  return new Set(entries.map((entry) => entry.employeeId)).size;
}
