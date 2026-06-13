// src/lib/__tests__/aiPlanner.test.ts
import { generateSplitOptions, calculateNextWeight } from '@/lib/aiPlanner';
import { UserProfile } from '@/lib/types';

describe('generateSplitOptions', () => {
  const baseProfile: UserProfile = {
    bodyWeight: 80,
    goalWeight: null,
    height: 175,
    fitnessGoal: 'Bulk',
    gymExperience: 'Intermediate',
    workoutDays: 4,
    muscleGroupsPerDay: '2 Muscles',
    musclePriorities: ['Chest', 'Back', 'Legs', 'Shoulders'],
  };

  it('produces at least one option', () => {
    const opts = generateSplitOptions(baseProfile);
    (expect(opts.length) as any).toBeGreaterThan(0);
  });

  it('creates a push/pull/legs style when days >= 3', () => {
    const profile: UserProfile = { ...baseProfile, workoutDays: 5 };
    const opts = generateSplitOptions(profile);
    const pushPull = opts.find(o => o.name.toLowerCase().includes('synergistic'));
    (expect(pushPull) as any).toBeDefined();
    (expect(pushPull?.days.length) as any).toBe(5);
  });

  it('creates a bro‑split when 1 Muscle is selected', () => {
    const profile: UserProfile = { ...baseProfile, muscleGroupsPerDay: '1 Muscle' };
    const opts = generateSplitOptions(profile);
    const bro = opts.find(o => o.name.toLowerCase().includes('bro split'));
    (expect(bro) as any).toBeDefined();
    (expect(bro?.days[0].length) as any).toBe(1);
  });

  it('creates a full‑body option when Full Body is selected', () => {
    const profile: UserProfile = { ...baseProfile, muscleGroupsPerDay: 'Full Body' };
    const opts = generateSplitOptions(profile);
    const full = opts.find(o => o.name.toLowerCase().includes('full body'));
    (expect(full) as any).toBeDefined();
    (expect(full?.days[0].length) as any).toBeGreaterThanOrEqual(profile.musclePriorities.length);
  });
});

describe('calculateNextWeight progression', () => {
  it('increments 5% on easy', () => {
    (expect(calculateNextWeight(100, 'easy')) as any).toBe(105);
  });
  it('increments 2.5% on moderate', () => {
    (expect(calculateNextWeight(100, 'moderate')) as any).toBe(103);
  });
  it('keeps same on hard', () => {
    (expect(calculateNextWeight(100, 'hard')) as any).toBe(100);
  });
  it('decrements 5% on failed', () => {
    (expect(calculateNextWeight(100, 'failed')) as any).toBe(95);
  });
});
