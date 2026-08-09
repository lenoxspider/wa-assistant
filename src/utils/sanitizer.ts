export function sanitizeLogData(data: any): any {
  if (typeof data === 'string') {
    return data
      .replace(/([a-zA-Z0-9_-]{32,})/g, '***REDACTED_TOKEN***')
      .replace(/Bearer\s+[^\s]+/gi, 'Bearer ***REDACTED***');
  }
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = Array.isArray(data) ? [] : {};
    for (const key of Object.keys(data)) {
      if (['token', 'password', 'secret', 'authorization', 'apikey', 'authtoken'].includes(key.toLowerCase())) {
        sanitized[key] = '***REDACTED***';
      } else {
        sanitized[key] = sanitizeLogData(data[key]);
      }
    }
    return sanitized;
  }
  return data;
}
