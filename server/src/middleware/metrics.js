const metricsData = {
  startedAt: new Date(),
  requestsTotal: 0,
  activeRequests: 0,
  slowRequestsTotal: 0, // Requests > 500ms
  statusCodes: {
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0
  },
  recentLatencies: [],
  maxLatencyBuffer: 500
};

export const metricsCollector = (req, res, next) => {
  // Skip metrics collection for health & docs probes
  if (req.path.startsWith('/health') || req.path.startsWith('/api/docs')) {
    return next();
  }

  metricsData.requestsTotal += 1;
  metricsData.activeRequests += 1;

  const startHrTime = process.hrtime();

  res.on('finish', () => {
    metricsData.activeRequests = Math.max(0, metricsData.activeRequests - 1);

    const elapsedHrTime = process.hrtime(startHrTime);
    const durationMs = Math.round(elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6);

    // Track latency buffer
    metricsData.recentLatencies.push(durationMs);
    if (metricsData.recentLatencies.length > metricsData.maxLatencyBuffer) {
      metricsData.recentLatencies.shift();
    }

    if (durationMs > 500) {
      metricsData.slowRequestsTotal += 1;
    }

    // Status code bucket
    const statusCode = res.statusCode;
    if (statusCode >= 200 && statusCode < 300) metricsData.statusCodes['2xx'] += 1;
    else if (statusCode >= 300 && statusCode < 400) metricsData.statusCodes['3xx'] += 1;
    else if (statusCode >= 400 && statusCode < 500) metricsData.statusCodes['4xx'] += 1;
    else if (statusCode >= 500) metricsData.statusCodes['5xx'] += 1;
  });

  next();
};

export function getSystemMetrics() {
  const uptimeSeconds = Math.floor((Date.now() - metricsData.startedAt.getTime()) / 1000);
  const mem = process.memoryUsage();

  const sortedLatencies = [...metricsData.recentLatencies].sort((a, b) => a - b);
  const count = sortedLatencies.length;

  const avgLatency = count > 0 ? Math.round(sortedLatencies.reduce((a, b) => a + b, 0) / count) : 0;
  const p50 = count > 0 ? sortedLatencies[Math.floor(count * 0.5)] : 0;
  const p95 = count > 0 ? sortedLatencies[Math.floor(count * 0.95)] : 0;
  const p99 = count > 0 ? sortedLatencies[Math.floor(count * 0.99)] : 0;

  return {
    uptime: uptimeSeconds,
    startedAt: metricsData.startedAt.toISOString(),
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      memory: {
        rssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
        heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 10) / 10
      }
    },
    http: {
      requestsTotal: metricsData.requestsTotal,
      activeRequests: metricsData.activeRequests,
      slowRequestsTotal: metricsData.slowRequestsTotal,
      statusCodes: metricsData.statusCodes,
      latenciesMs: {
        sampleCount: count,
        avg: avgLatency,
        p50,
        p95,
        p99
      }
    }
  };
}

export default { metricsCollector, getSystemMetrics };
