import type { StaffProfile } from '../src/types.ts';
export function validProfilePhoto(value: unknown): boolean {
  if (value === '') return true;
  if (typeof value !== 'string' || value.length > 2000) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password &&
      (u.hostname === 'firebasestorage.googleapis.com' || u.hostname === 'lh3.googleusercontent.com' || u.hostname === 'lh4.googleusercontent.com' || u.hostname === 'lh5.googleusercontent.com' || u.hostname === 'lh6.googleusercontent.com');
  } catch { return false; }
}
export function validEmploymentDate(value: unknown): boolean {
  if (value === '') return true;
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0,10) === value && value <= new Date().toISOString().slice(0,10);
}
export function validStaffProfile(value: unknown): value is StaffProfile {
  if (!value || typeof value !== 'object') return false;
  const p = value as StaffProfile;
  return (['uid','email','name','phone','position','company','employmentSince','expertise','photoUrl','updatedAt'] as const).every((k)=>typeof p[k] === 'string') &&
    p.uid.length > 0 && p.uid.length <= 128 && p.email.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email) &&
    Boolean(p.name.trim()) && p.name.length <= 100 && p.phone.length <= 40 && /^[+\d\s().-]*$/.test(p.phone) &&
    p.position.length <= 120 && p.company.length <= 160 && p.expertise.length <= 500 && validEmploymentDate(p.employmentSince) &&
    validProfilePhoto(p.photoUrl) && p.updatedAt.length <= 40;
}
export function validStaffProfiles(value: unknown): value is StaffProfile[] {
  return Array.isArray(value) && value.length <= 300 && value.every(validStaffProfile) && new Set(value.map((p)=>p.uid)).size === value.length;
}
export function employmentDuration(since: string, now = new Date()): string {
  if (!validEmploymentDate(since) || !since) return 'Ej angivet';
  const d = new Date(since + 'T00:00:00Z');
  const months = Math.max(0,(now.getUTCFullYear()-d.getUTCFullYear())*12 + now.getUTCMonth()-d.getUTCMonth() - (now.getUTCDate()<d.getUTCDate()?1:0));
  return months < 1 ? 'Mindre än en månad' : `${Math.floor(months/12)} år och ${months%12} månader`;
}
