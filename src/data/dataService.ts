import type { Bank, LoanTemplate } from './loanTemplates';

const BASE_URL = 'https://raw.githubusercontent.com/kalkulator-wibor/dane/main';
const CACHE_KEY_BANKS = 'remote-banks';
const CACHE_KEY_TEMPLATES = 'remote-templates';
const CACHE_MAX_AGE = 1000 * 60 * 60; // 1h

interface CachedData<T> {
  data: T[];
  fetchedAt: number;
}

function isFresh<T>(cached: CachedData<T> | null): cached is CachedData<T> {
  return !!cached && (Date.now() - cached.fetchedAt) < CACHE_MAX_AGE;
}

function loadCache<T>(key: string): CachedData<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveCache<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify({ data, fetchedAt: Date.now() }));
  } catch {}
}

async function fetchJson<T>(path: string): Promise<T[] | null> {
  try {
    const res = await fetch(`${BASE_URL}/${path}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface RemoteData {
  banks: Bank[];
  templates: LoanTemplate[];
}

// Bundled fallback — minimal, last-resort
const FALLBACK_BANKS: Bank[] = [];
const FALLBACK_TEMPLATES: LoanTemplate[] = [];

export async function loadRemoteData(): Promise<RemoteData> {
  // 1. Try cache
  const cachedBanks = loadCache<Bank>(CACHE_KEY_BANKS);
  const cachedTemplates = loadCache<LoanTemplate>(CACHE_KEY_TEMPLATES);

  if (isFresh(cachedBanks) && isFresh(cachedTemplates)) {
    return { banks: cachedBanks.data, templates: cachedTemplates.data };
  }

  // 2. Try fetch
  const [banks, templates] = await Promise.all([
    fetchJson<Bank>('banks.json'),
    fetchJson<LoanTemplate>('loanTemplates.json'),
  ]);

  if (banks && templates) {
    saveCache(CACHE_KEY_BANKS, banks);
    saveCache(CACHE_KEY_TEMPLATES, templates);
    return { banks, templates };
  }

  // 3. Stale cache better than nothing
  if (cachedBanks?.data && cachedTemplates?.data) {
    return { banks: cachedBanks.data, templates: cachedTemplates.data };
  }

  // 4. Fallback — empty (app works, just no templates)
  return { banks: FALLBACK_BANKS, templates: FALLBACK_TEMPLATES };
}
