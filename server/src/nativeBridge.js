import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

let addon = null;

export function loadNative() {
  if (addon !== null) return addon;
  const base = path.join(__dirname, '..', '..', 'native', 'build');
  const candidates = [
    path.join(base, 'Release', 'aseo_native.node'),
    path.join(base, 'Debug', 'aseo_native.node')
  ];
  let loaded = null;
  for (const modPath of candidates) {
    try {
      loaded = require(modPath);
      break;
    } catch {
      // siguiente ruta
    }
  }
  addon = loaded || false;
  return addon;
}

export function generatePdfNative(opts) {
  const n = loadNative();
  if (!n || !n.generatePdfReport) return null;
  return Buffer.from(n.generatePdfReport(opts.title || 'Reporte', opts.lines || []));
}

export function aggregateComplianceNative(weeklyCompleted) {
  const n = loadNative();
  if (!n || !n.aggregateWeeklyCompliance) {
    const arr = weeklyCompleted || [];
    const sum = arr.reduce((a, b) => a + b, 0);
    return { sum, avg: arr.length ? sum / arr.length : 0, peakIndex: arr.indexOf(Math.max(...arr, 0)) };
  }
  return n.aggregateWeeklyCompliance(weeklyCompleted || []);
}
