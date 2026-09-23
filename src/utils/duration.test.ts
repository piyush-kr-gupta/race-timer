import { describe, it, expect } from 'vitest';
import { parseDurationToSeconds, formatTime, formatDurationHuman } from './duration';

describe('parseDurationToSeconds', () => {
  it('parses colon format mm:ss correctly', () => {
    expect(parseDurationToSeconds('5:00')).toBe(300);
    expect(parseDurationToSeconds('05:00')).toBe(300);
    expect(parseDurationToSeconds('0:45')).toBe(45);
    expect(parseDurationToSeconds('12:34')).toBe(754);
  });

  it('parses colon format hh:mm:ss correctly', () => {
    expect(parseDurationToSeconds('1:30:00')).toBe(5400);
    expect(parseDurationToSeconds('01:00:00')).toBe(3600);
    expect(parseDurationToSeconds('2:15:30')).toBe(8130);
  });

  it('parses unit suffixes correctly', () => {
    expect(parseDurationToSeconds('5m')).toBe(300);
    expect(parseDurationToSeconds('5min')).toBe(300);
    expect(parseDurationToSeconds('5mins')).toBe(300);
    expect(parseDurationToSeconds('1h')).toBe(3600);
    expect(parseDurationToSeconds('1hr')).toBe(3600);
    expect(parseDurationToSeconds('90s')).toBe(90);
    expect(parseDurationToSeconds('45sec')).toBe(45);
    expect(parseDurationToSeconds('1h 30m')).toBe(5400);
    expect(parseDurationToSeconds('2m 15s')).toBe(135);
  });

  it('parses pure integers appropriately', () => {
    // 5 minutes
    expect(parseDurationToSeconds('5')).toBe(300);
    expect(parseDurationToSeconds(5)).toBe(5); // number input is raw seconds
    expect(parseDurationToSeconds('25')).toBe(1500);
    // 90 minutes
    expect(parseDurationToSeconds('90')).toBe(5400);
    // > 180 treated as raw seconds
    expect(parseDurationToSeconds('300')).toBe(300);
  });

  it('handles invalid or empty inputs gracefully', () => {
    expect(parseDurationToSeconds('')).toBe(0);
    expect(parseDurationToSeconds(null)).toBe(0);
    expect(parseDurationToSeconds(undefined)).toBe(0);
    expect(parseDurationToSeconds('abc')).toBe(0);
    expect(parseDurationToSeconds('-10')).toBe(0);
  });
});

describe('formatTime', () => {
  it('formats standard mm:ss', () => {
    expect(formatTime(300)).toBe('05:00');
    expect(formatTime(45)).toBe('00:45');
    expect(formatTime(0)).toBe('00:00');
  });

  it('formats hours when duration >= 3600 or forced', () => {
    expect(formatTime(3600)).toBe('1:00:00');
    expect(formatTime(5400)).toBe('1:30:00');
    expect(formatTime(300, { forceHours: true })).toBe('0:05:00');
  });

  it('formats overtime with plus sign', () => {
    expect(formatTime(137, { showSign: true })).toBe('+02:17');
    expect(formatTime(0, { showSign: true })).toBe('+00:00');
  });
});

describe('formatDurationHuman', () => {
  it('formats human strings', () => {
    expect(formatDurationHuman(300)).toBe('5m');
    expect(formatDurationHuman(5400)).toBe('1h 30m');
    expect(formatDurationHuman(45)).toBe('45s');
    expect(formatDurationHuman(0)).toBe('0m');
  });
});
