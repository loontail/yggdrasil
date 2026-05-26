import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StrapiInstance } from '../types';
import { createJoinSessionsService } from './join-sessions';

const buildStrapi = (joinBackend: 'memory' | 'db' = 'memory'): StrapiInstance => {
  const cfg = {
    publicUrl: 'https://example.test/api/yggdrasil',
    skinDomains: [],
    serverName: 'Test',
    implementationName: 'test',
    implementationVersion: '0',
    tokens: { accessTtlSeconds: 60, maxPerUser: 5 },
    privateKeyPath: 'data/yggdrasil/keys/active.key.pem',
    joinBackend,
  };
  return {
    log: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    dirs: { app: { root: '/tmp', src: '/tmp' } },
    config: { get: (key: string) => (key === 'plugin::yggdrasil' ? cfg : undefined) },
    db: {
      connection: (() => ({})) as unknown as StrapiInstance['db']['connection'],
      query: () => ({
        findOne: async () => null,
        findMany: async () => [],
        create: async () => null,
        update: async () => null,
        delete: async () => null,
        count: async () => 0,
      }),
    },
    plugin: () => ({
      service: () => ({}),
      config: () => undefined,
    }),
  };
};

describe('joinSessionsService (memory backend)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('put + take returns the stored entry exactly once', async () => {
    const svc = createJoinSessionsService({ strapi: buildStrapi() });
    await svc.put('server-id', { userId: 42 });
    expect(await svc.take('server-id')).toEqual({ userId: 42 });
    // Second take is empty — entries are consumed on read.
    expect(await svc.take('server-id')).toBeNull();
    svc.dispose();
  });

  it('preserves the optional ip alongside userId', async () => {
    const svc = createJoinSessionsService({ strapi: buildStrapi() });
    await svc.put('s2', { userId: 7, ip: '203.0.113.4' });
    expect(await svc.take('s2')).toEqual({ userId: 7, ip: '203.0.113.4' });
    svc.dispose();
  });

  it('returns null after the 30 s TTL elapses', async () => {
    const svc = createJoinSessionsService({ strapi: buildStrapi() });
    await svc.put('s3', { userId: 1 });
    vi.advanceTimersByTime(31_000);
    expect(await svc.take('s3')).toBeNull();
    svc.dispose();
  });

  it('size() sweeps expired entries opportunistically', async () => {
    const svc = createJoinSessionsService({ strapi: buildStrapi() });
    await svc.put('a', { userId: 1 });
    await svc.put('b', { userId: 2 });
    expect(await svc.size()).toBe(2);
    vi.advanceTimersByTime(31_000);
    expect(await svc.size()).toBe(0);
    svc.dispose();
  });

  it('db backend falls back to memory with a warn (placeholder)', async () => {
    const strapi = buildStrapi('db');
    const warn = vi.spyOn(strapi.log, 'warn');
    const svc = createJoinSessionsService({ strapi });
    expect(warn).toHaveBeenCalledOnce();
    await svc.put('s', { userId: 9 });
    expect(await svc.take('s')).toEqual({ userId: 9 });
    svc.dispose();
  });
});
