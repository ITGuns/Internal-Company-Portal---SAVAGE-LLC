import assert from 'node:assert/strict'
import {
  businessMinutesBetween,
  businessMinutesElapsed,
  slaState,
  slaTargetsForTier,
} from '../src/clients/gemfield/gemfield-sla'

// Reference dates (UTC). 2026-01-02 = Friday, 01-03 = Saturday, 01-05 = Monday.
const utc = (month: number, day: number, hour: number, minute = 0) =>
  new Date(Date.UTC(2026, month, day, hour, minute, 0, 0))

function testBusinessMinutes(): void {
  // Within one work day: Mon 09:00 -> 12:00 = 180 min.
  assert.equal(businessMinutesBetween(utc(0, 5, 9), utc(0, 5, 12)), 180, 'same-day in-hours')

  // Before/after hours is clamped: Mon 07:00 -> 18:00 counts only 09:00-17:00 = 480 min.
  assert.equal(businessMinutesBetween(utc(0, 5, 7), utc(0, 5, 18)), 480, 'clamped to business window')

  // Across a weekend: Fri 16:00 -> Mon 10:00 = 60 (Fri 16-17) + 60 (Mon 9-10) = 120 min.
  assert.equal(businessMinutesBetween(utc(0, 2, 16), utc(0, 5, 10)), 120, 'weekend is skipped')

  // Non-work day only: all of Saturday = 0.
  assert.equal(businessMinutesBetween(utc(0, 3, 10), utc(0, 3, 14)), 0, 'Saturday counts zero')

  // Zero / reversed ranges.
  assert.equal(businessMinutesBetween(utc(0, 5, 12), utc(0, 5, 9)), 0, 'reversed range is zero')
}

function testElapsedWithPause(): void {
  // Mon 09:00 -> 12:00 (180) minus a 30-min waiting-on-client pause 10:00-10:30 = 150.
  const elapsed = businessMinutesElapsed(utc(0, 5, 9), utc(0, 5, 12), [{ from: utc(0, 5, 10), to: utc(0, 5, 10, 30) }])
  assert.equal(elapsed, 150, 'pause is subtracted')

  // A pause entirely outside business hours subtracts nothing.
  const noEffect = businessMinutesElapsed(utc(0, 5, 9), utc(0, 5, 12), [{ from: utc(0, 5, 18), to: utc(0, 5, 20) }])
  assert.equal(noEffect, 180, 'out-of-hours pause has no effect')
}

function testSlaState(): void {
  assert.equal(slaState(100, 200), 'on_track', 'well under target')
  assert.equal(slaState(170, 200), 'due_soon', 'past 80% of target')
  assert.equal(slaState(200, 200), 'breached', 'at/over target')
  assert.equal(slaState(999, 200, true), 'met', 'met short-circuits regardless of elapsed')
}

function testTierTargets(): void {
  assert.equal(slaTargetsForTier('Premium').firstResponseMinutes, 120, 'premium tier resolves')
  assert.equal(slaTargetsForTier('nonexistent').firstResponseMinutes, 480, 'unknown tier -> default')
  assert.equal(slaTargetsForTier(null).firstResponseMinutes, 480, 'null tier -> default')
}

testBusinessMinutes()
testElapsedWithPause()
testSlaState()
testTierTargets()
console.log('gemfield-sla tests passed')
