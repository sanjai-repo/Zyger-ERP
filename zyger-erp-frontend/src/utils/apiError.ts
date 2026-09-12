export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    if (err.response && typeof err.response === 'object') {
      const resp = err.response as Record<string, unknown>;
      if (resp.data && typeof resp.data === 'object') {
        const data = resp.data as Record<string, unknown>;
        if (data.message && typeof data.message === 'string' && data.message.trim() !== '') {
          return data.message;
        }
        if (data.error && typeof data.error === 'string' && data.error.trim() !== '') {
          return data.error;
        }
      }
    }
  }
  if (error instanceof Error && error.message) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed === 'object' && parsed.message) {
        return String(parsed.message);
      }
    } catch {
      // Not JSON
    }
    return error.message;
  }
  return fallback;
}