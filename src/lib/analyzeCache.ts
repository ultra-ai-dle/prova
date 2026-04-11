import { AnalyzeMetadata } from "@/types/prova";

const STORAGE_PREFIX = "prova_analyze_v1_";
const MAX_ENTRIES = 200;
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일

interface CacheEntry {
  metadata: AnalyzeMetadata;
  timestamp: number;
  lruOrder: number;
}

// 세션 내 LRU 순서 추적용 단조 카운터
let lruCounter = Date.now();

async function hashKey(raw: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

function storageKey(hash: string): string {
  return `${STORAGE_PREFIX}${hash}`;
}

function evictIfNeeded(): void {
  const allKeys: Array<{ key: string; lruOrder: number }> = [];

  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith(STORAGE_PREFIX)) continue;
    try {
      const entry: CacheEntry = JSON.parse(localStorage.getItem(k)!);
      allKeys.push({ key: k, lruOrder: entry.lruOrder });
    } catch {
      localStorage.removeItem(k!);
    }
  }

  if (allKeys.length < MAX_ENTRIES) return;

  allKeys.sort((a, b) => a.lruOrder - b.lruOrder);
  const toRemove = allKeys.slice(0, allKeys.length - MAX_ENTRIES + 1);
  for (const { key } of toRemove) {
    localStorage.removeItem(key);
  }
}

function clearHalfCache(): void {
  const allKeys: Array<{ key: string; lruOrder: number }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith(STORAGE_PREFIX)) continue;
    try {
      const entry: CacheEntry = JSON.parse(localStorage.getItem(k)!);
      allKeys.push({ key: k, lruOrder: entry.lruOrder });
    } catch {
      localStorage.removeItem(k!);
    }
  }
  allKeys.sort((a, b) => a.lruOrder - b.lruOrder);
  allKeys
    .slice(0, Math.ceil(allKeys.length / 2))
    .forEach(({ key }) => localStorage.removeItem(key));
}

export async function getFromCache(
  rawKey: string
): Promise<AnalyzeMetadata | null> {
  try {
    const hash = await hashKey(rawKey);
    const raw = localStorage.getItem(storageKey(hash));
    if (!raw) return null;

    const entry: CacheEntry = JSON.parse(raw);

    if (Date.now() - entry.timestamp > TTL_MS) {
      localStorage.removeItem(storageKey(hash));
      return null;
    }

    // 접근 시마다 LRU 순서 갱신
    entry.lruOrder = ++lruCounter;
    localStorage.setItem(storageKey(hash), JSON.stringify(entry));

    return entry.metadata;
  } catch {
    // localStorage 접근 불가(시크릿 모드, 용량 등) → 무시
    return null;
  }
}

export async function saveToCache(
  rawKey: string,
  metadata: AnalyzeMetadata
): Promise<void> {
  try {
    evictIfNeeded();

    const hash = await hashKey(rawKey);
    const entry: CacheEntry = {
      metadata,
      timestamp: Date.now(),
      lruOrder: ++lruCounter,
    };
    localStorage.setItem(storageKey(hash), JSON.stringify(entry));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      clearHalfCache();
      try {
        const hash = await hashKey(rawKey);
        localStorage.setItem(
          storageKey(hash),
          JSON.stringify({
            metadata,
            timestamp: Date.now(),
            lruOrder: ++lruCounter,
          })
        );
      } catch {
        // 재시도도 실패 시 무시 — 메모리 캐시만으로 fallback
      }
    }
  }
}
