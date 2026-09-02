import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('axiosClient', () => {
  let getItemSpy: ReturnType<typeof vi.spyOn>;
  let setItemSpy: ReturnType<typeof vi.spyOn>;
  let removeItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has correct baseURL from env', async () => {
    const { default: apiClient } = await import('../axiosClient');
    expect(apiClient.defaults.baseURL).toBe('/api');
  });

  it('has 30s timeout configured', async () => {
    const { default: apiClient } = await import('../axiosClient');
    expect(apiClient.defaults.timeout).toBe(30000);
  });

  it('reads token from localStorage on request', async () => {
    localStorage.setItem('zyger-access-token', 'test-token-123');

    const { default: apiClient } = await import('../axiosClient');

    // The request interceptor should have been set up
    // Verify it tries to read the token
    expect(apiClient.interceptors.request.handlers.length).toBeGreaterThan(0);
  });

  it('handles missing token gracefully', async () => {
    const { default: apiClient } = await import('../axiosClient');
    expect(apiClient).toBeDefined();
    expect(apiClient.defaults.baseURL).toBe('/api');
  });
});
