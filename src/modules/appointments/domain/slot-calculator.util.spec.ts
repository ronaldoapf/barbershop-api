import {
  combineDateAndTime,
  computeAvailableSlots,
} from './slot-calculator.util';
import { AvailabilityWindow } from '../../working-hours/domain/availability-window';

describe('computeAvailableSlots', () => {
  const date = new Date('2026-08-17');
  const window: AvailabilityWindow = {
    isWorking: true,
    startTime: '09:00',
    endTime: '12:00',
  };

  it('returns an empty array when the barber is not working', () => {
    const slots = computeAvailableSlots(
      date,
      { isWorking: false, startTime: null, endTime: null },
      [],
      30,
    );
    expect(slots).toEqual([]);
  });

  it('fills the entire window with duration-sized slots when there are no busy intervals', () => {
    const slots = computeAvailableSlots(date, window, [], 60);

    expect(slots).toEqual([
      combineDateAndTime(date, '09:00'),
      combineDateAndTime(date, '10:00'),
      combineDateAndTime(date, '11:00'),
    ]);
  });

  it('excludes a slot that would overlap a busy interval', () => {
    const slots = computeAvailableSlots(
      date,
      window,
      [
        {
          startsAt: combineDateAndTime(date, '10:00'),
          endsAt: combineDateAndTime(date, '10:30'),
        },
      ],
      30,
    );

    expect(slots).toEqual([
      combineDateAndTime(date, '09:00'),
      combineDateAndTime(date, '09:30'),
      combineDateAndTime(date, '10:30'),
      combineDateAndTime(date, '11:00'),
      combineDateAndTime(date, '11:30'),
    ]);
  });

  it('offers a slot immediately after a busy interval ends (adjacent, not overlapping)', () => {
    const slots = computeAvailableSlots(
      date,
      { isWorking: true, startTime: '09:00', endTime: '10:00' },
      [
        {
          startsAt: combineDateAndTime(date, '09:00'),
          endsAt: combineDateAndTime(date, '09:30'),
        },
      ],
      30,
    );

    expect(slots).toEqual([combineDateAndTime(date, '09:30')]);
  });

  it('offers a slot that ends exactly at the window boundary (exact-boundary)', () => {
    const slots = computeAvailableSlots(
      date,
      { isWorking: true, startTime: '09:00', endTime: '09:30' },
      [],
      30,
    );

    expect(slots).toEqual([combineDateAndTime(date, '09:00')]);
  });

  it('excludes a slot that would end one minute past the window boundary', () => {
    const slots = computeAvailableSlots(
      date,
      { isWorking: true, startTime: '09:00', endTime: '09:29' },
      [],
      30,
    );

    expect(slots).toEqual([]);
  });

  it('handles multiple, unordered busy intervals correctly', () => {
    const slots = computeAvailableSlots(
      date,
      window,
      [
        {
          startsAt: combineDateAndTime(date, '11:00'),
          endsAt: combineDateAndTime(date, '11:30'),
        },
        {
          startsAt: combineDateAndTime(date, '09:30'),
          endsAt: combineDateAndTime(date, '10:00'),
        },
      ],
      30,
    );

    expect(slots).toEqual([
      combineDateAndTime(date, '09:00'),
      combineDateAndTime(date, '10:00'),
      combineDateAndTime(date, '10:30'),
      combineDateAndTime(date, '11:30'),
    ]);
  });

  it('merges overlapping busy intervals instead of double counting the gap', () => {
    const slots = computeAvailableSlots(
      date,
      window,
      [
        {
          startsAt: combineDateAndTime(date, '09:00'),
          endsAt: combineDateAndTime(date, '10:00'),
        },
        {
          startsAt: combineDateAndTime(date, '09:30'),
          endsAt: combineDateAndTime(date, '11:00'),
        },
      ],
      30,
    );

    expect(slots).toEqual([
      combineDateAndTime(date, '11:00'),
      combineDateAndTime(date, '11:30'),
    ]);
  });

  it('ignores busy intervals entirely outside the working window', () => {
    const slots = computeAvailableSlots(
      date,
      window,
      [
        {
          startsAt: combineDateAndTime(date, '07:00'),
          endsAt: combineDateAndTime(date, '08:00'),
        },
        {
          startsAt: combineDateAndTime(date, '13:00'),
          endsAt: combineDateAndTime(date, '14:00'),
        },
      ],
      60,
    );

    expect(slots).toEqual([
      combineDateAndTime(date, '09:00'),
      combineDateAndTime(date, '10:00'),
      combineDateAndTime(date, '11:00'),
    ]);
  });

  it('returns no slots when a busy interval fully consumes the window', () => {
    const slots = computeAvailableSlots(
      date,
      window,
      [
        {
          startsAt: combineDateAndTime(date, '08:00'),
          endsAt: combineDateAndTime(date, '13:00'),
        },
      ],
      30,
    );

    expect(slots).toEqual([]);
  });
});
