import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  data: any;
  expiresAt: number;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttl || this.defaultTTL),
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const responseCache = new ResponseCache();

export function cacheMiddleware(ttlSeconds = 300, cacheKeyGenerator?: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = cacheKeyGenerator 
      ? cacheKeyGenerator(req) 
      : req.originalUrl;

    const cachedData = responseCache.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (body?.success) {
        responseCache.set(cacheKey, body, ttlSeconds * 1000);
      }
      return originalJson(body);
    };

    next();
  };
}

export function invalidateCache(pattern: string): void {
  responseCache.invalidatePattern(pattern);
}

export function clearCache(): void {
  responseCache.clear();
}