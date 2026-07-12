import path from 'node:path';

function isSameOrDescendant(parentPath, candidatePath) {
  const relative = path.relative(parentPath, candidatePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function createDashboardViteRuntimeConfiguration({ sourceRoot, runtimeRoot, cacheDirectoryName = 'vite-cache' }) {
  if (typeof sourceRoot !== 'string' || !sourceRoot || typeof runtimeRoot !== 'string' || !runtimeRoot) {
    throw new TypeError('Dashboard Vite source and runtime roots must be non-empty paths');
  }
  if (typeof cacheDirectoryName !== 'string' || !/^[A-Za-z0-9._-]+$/.test(cacheDirectoryName)) {
    throw new TypeError('Dashboard Vite cache directory name must be a safe path segment');
  }

  const resolvedSourceRoot = path.resolve(sourceRoot);
  const cacheDir = path.resolve(runtimeRoot, cacheDirectoryName);
  if (isSameOrDescendant(resolvedSourceRoot, cacheDir)) {
    const error = new Error('Dashboard Vite mutable cache must stay outside the application source root');
    error.code = 'DASHBOARD_VITE_CACHE_BOUNDARY';
    throw error;
  }

  return Object.freeze({ cacheDir });
}
