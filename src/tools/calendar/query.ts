import {
  normalizeDateInput,
  normalizeTimeInput,
  validateDate,
  validateTime,
} from "../bazi/calc.js";

export interface ChineseCalendarData {
  公历: string;
  农历: string;
  干支日期: string;
  生肖: string;
  纳音: string;
  农历节日?: string;
  公历节日?: string;
  节气: {
    term: string;
    afterDays: number;
    nextTerm?: string;
    beforeNextTermDays?: number;
  };
  二十八宿: string;
  彭祖百忌: string;
  喜神方位: string;
  阳贵神方位: string;
  阴贵神方位: string;
  福神方位: string;
  财神方位: string;
  冲煞: string;
  宜: string;
  忌: string;
}

export interface ParsedDateTimeInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  display: string;
}

export function parseDateTimeInput(input?: string): ParsedDateTimeInput {
  if (!input || !input.trim()) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: now.getSeconds(),
      display: `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")} ${`${now.getHours()}`.padStart(2, "0")}:${`${now.getMinutes()}`.padStart(2, "0")}:${`${now.getSeconds()}`.padStart(2, "0")}`,
    };
  }

  const raw = input.trim();
  if (raw.includes("今天")) {
    return parseDateTimeInput();
  }
  if (raw.includes("明天")) {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    return parseDateTimeInput(`${next.getFullYear()}-${`${next.getMonth() + 1}`.padStart(2, "0")}-${`${next.getDate()}`.padStart(2, "0")}`);
  }
  if (raw.includes("后天")) {
    const next = new Date();
    next.setDate(next.getDate() + 2);
    return parseDateTimeInput(`${next.getFullYear()}-${`${next.getMonth() + 1}`.padStart(2, "0")}-${`${next.getDate()}`.padStart(2, "0")}`);
  }
  if (raw.includes("昨天")) {
    const prev = new Date();
    prev.setDate(prev.getDate() - 1);
    return parseDateTimeInput(`${prev.getFullYear()}-${`${prev.getMonth() + 1}`.padStart(2, "0")}-${`${prev.getDate()}`.padStart(2, "0")}`);
  }
  const directDate = new Date(raw.includes("T") ? raw : raw.replace(" ", "T"));
  if (!Number.isNaN(directDate.getTime())) {
    return {
      year: directDate.getFullYear(),
      month: directDate.getMonth() + 1,
      day: directDate.getDate(),
      hour: directDate.getHours(),
      minute: directDate.getMinutes(),
      second: directDate.getSeconds(),
      display: `${directDate.getFullYear()}-${`${directDate.getMonth() + 1}`.padStart(2, "0")}-${`${directDate.getDate()}`.padStart(2, "0")} ${`${directDate.getHours()}`.padStart(2, "0")}:${`${directDate.getMinutes()}`.padStart(2, "0")}:${`${directDate.getSeconds()}`.padStart(2, "0")}`,
    };
  }

  const [datePart, timePart] = raw.split(/\s+/, 2);
  const date = normalizeDateInput(datePart);
  validateDate(date);
  const time = timePart ? normalizeTimeInput(timePart) : "12:00";
  validateTime(time);
  const [year, month, day] = date.split("-").map((x) => Number.parseInt(x, 10));
  const [hour, minute] = time.split(":").map((x) => Number.parseInt(x, 10));

  return {
    year,
    month,
    day,
    hour,
    minute,
    second: 0,
    display: `${date} ${time}:00`,
  };
}

export async function queryChineseCalendar(params: {
  year: number;
  month: number;
  day: number;
}): Promise<ChineseCalendarData | undefined> {
  try {
    const { getChineseCalendar } = (await import("cantian-tymext")) as {
      getChineseCalendar: (time: {
        year: number;
        month: number;
        day: number;
      }) => ChineseCalendarData;
    };
    return getChineseCalendar({
      year: params.year,
      month: params.month,
      day: params.day,
    });
  } catch {
    return undefined;
  }
}
