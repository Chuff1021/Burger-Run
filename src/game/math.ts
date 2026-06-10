import { LANES } from './constants';

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

export const laneX = (lane: number) => LANES[clamp(lane, 0, LANES.length - 1)] ?? 0;

export const randomChoice = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]!;

export const formatNumber = (value: number) => Math.floor(value).toLocaleString('en-US');

export const formatMeters = (value: number) => `${Math.floor(value).toLocaleString('en-US')} M`;
