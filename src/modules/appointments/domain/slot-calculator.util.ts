import { AvailabilityWindow } from '../../working-hours/domain/availability-window';

export interface BusyInterval {
  startsAt: Date;
  endsAt: Date;
}

export function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      hours,
      minutes,
      0,
      0,
    ),
  );
}

export function computeAvailableSlots(
  date: Date,
  window: AvailabilityWindow,
  busyIntervals: BusyInterval[],
  durationMinutes: number,
): Date[] {
  if (!window.isWorking || !window.startTime || !window.endTime) {
    return [];
  }

  const windowStart = combineDateAndTime(date, window.startTime);
  const windowEnd = combineDateAndTime(date, window.endTime);
  const durationMs = durationMinutes * 60_000;

  const sortedBusy = [...busyIntervals]
    .filter((b) => b.endsAt > windowStart && b.startsAt < windowEnd)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const slots: Date[] = [];
  let cursor = windowStart;

  for (const busy of sortedBusy) {
    const gapEnd = busy.startsAt < windowEnd ? busy.startsAt : windowEnd;
    slots.push(...fillGap(cursor, gapEnd, durationMs));
    if (busy.endsAt > cursor) {
      cursor = busy.endsAt;
    }
  }
  slots.push(...fillGap(cursor, windowEnd, durationMs));

  return slots;
}

function fillGap(gapStart: Date, gapEnd: Date, durationMs: number): Date[] {
  const slots: Date[] = [];
  let candidate = gapStart.getTime();
  while (candidate + durationMs <= gapEnd.getTime()) {
    slots.push(new Date(candidate));
    candidate += durationMs;
  }
  return slots;
}
