import type { SalaryEstimate } from '../src/types.ts';
import { sourceUrlValid } from './paketindexArchive.ts';
export function validSalaryEstimate(value: unknown): value is SalaryEstimate {
  if (!value || typeof value !== 'object') return false;
  const r = value as SalaryEstimate;
  return Number.isSafeInteger(r.min) && Number.isSafeInteger(r.max) && r.min > 0 && r.max >= r.min && r.max <= 1_000_000 &&
    r.currency === 'SEK' && r.period === 'month' && r.fullTime === true &&
    ['occupation', 'geography', 'sourceName', 'method'].every((key) => typeof r[key as keyof SalaryEstimate] === 'string' &&
      String(r[key as keyof SalaryEstimate]).trim().length > 0 && String(r[key as keyof SalaryEstimate]).length <= 500) &&
    ['local', 'regional', 'national'].includes(r.geographicLevel) && Number.isInteger(r.year) && r.year >= 2000 && r.year <= new Date().getFullYear() &&
    sourceUrlValid(r.sourceUrl);
}
