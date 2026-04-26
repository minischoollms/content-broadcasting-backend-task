/**
 * Subject-based rotation scheduler.
 *
 * Inputs: a list of *eligible* content items (already filtered to:
 *   - status = approved
 *   - now ∈ [start_time, end_time]
 *   - belonging to a given teacher).
 *
 * Behavior:
 *   1. Group items by subject — each subject rotates independently.
 *   2. Within a subject, sort by created_at (stable order) so the rotation is
 *      deterministic regardless of insertion timing.
 *   3. Anchor the rotation at the *earliest start_time of the group*. This way
 *      the rotation is deterministic and identical across server restarts —
 *      important for caching and for multiple replicas serving the same answer.
 *   4. Build a cumulative duration table (durations may vary per item).
 *      Compute position-within-cycle using `(now - anchor) % cycleLength`.
 *   5. Pick the first item whose cumulative bucket exceeds that position.
 */

export type ScheduleEligible = {
  id: string;
  subject: string;
  start_time: Date;
  end_time: Date;
  rotation_minutes: number;
  created_at: Date;
};

export type ActiveSlot<T extends ScheduleEligible> = {
  subject: string;
  active: T;
  rotation: {
    indexInCycle: number;
    cycleLength: number; // seconds
    elapsedInCycle: number; // seconds
    nextRotationAt: Date;
    totalInRotation: number;
  };
};

export function pickActivePerSubject<T extends ScheduleEligible>(
  items: T[],
  now: Date = new Date(),
): ActiveSlot<T>[] {
  if (items.length === 0) return [];

  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.subject.toLowerCase();
    const arr = groups.get(key) ?? [];
    arr.push(item);
    groups.set(key, arr);
  }

  const result: ActiveSlot<T>[] = [];
  for (const [, group] of groups) {
    group.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());

    const anchorMs = Math.min(...group.map((c) => c.start_time.getTime()));
    const durationsSec = group.map((c) => Math.max(1, c.rotation_minutes) * 60);
    const cycleLength = durationsSec.reduce((a, b) => a + b, 0);
    if (cycleLength === 0) continue;

    const elapsedSec = Math.max(0, Math.floor((now.getTime() - anchorMs) / 1000));
    const elapsedInCycle = elapsedSec % cycleLength;

    let cum = 0;
    let activeIdx = 0;
    for (let i = 0; i < durationsSec.length; i++) {
      cum += durationsSec[i]!;
      if (elapsedInCycle < cum) {
        activeIdx = i;
        break;
      }
    }

    const cumBeforeActive = durationsSec.slice(0, activeIdx).reduce((a, b) => a + b, 0);
    const remainingInThisItem =
      durationsSec[activeIdx]! - (elapsedInCycle - cumBeforeActive);
    const nextRotationAt = new Date(now.getTime() + remainingInThisItem * 1000);

    result.push({
      subject: group[0]!.subject,
      active: group[activeIdx]!,
      rotation: {
        indexInCycle: activeIdx,
        cycleLength,
        elapsedInCycle,
        nextRotationAt,
        totalInRotation: group.length,
      },
    });
  }

  return result;
}

export function pickActiveForSubject<T extends ScheduleEligible>(
  items: T[],
  subject: string,
  now: Date = new Date(),
): ActiveSlot<T> | null {
  const filtered = items.filter((i) => i.subject.toLowerCase() === subject.toLowerCase());
  const all = pickActivePerSubject(filtered, now);
  return all[0] ?? null;
}
