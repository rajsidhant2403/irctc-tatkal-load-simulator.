import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PARAMS,
  createSpike,
  generateTimeLabels,
  generateSimulationData,
  calculateMetrics,
  generatePythonScript,
  generateCsvData,
} from './simulation';

test('generateTimeLabels produces exactly 301 labels from 08:00 to 13:00', () => {
  const labels = generateTimeLabels();
  assert.equal(labels.length, 301);
  assert.equal(labels[0], '08:00');
  assert.equal(labels[60], '09:00');
  assert.equal(labels[120], '10:00');
  assert.equal(labels[180], '11:00');
  assert.equal(labels[240], '12:00');
  assert.equal(labels[300], '13:00');
});

test('createSpike returns peak height at centerIdx and decays symmetrically', () => {
  const peak = createSpike(120, 120, 2500000, 1.5);
  assert.equal(peak, 2500000);

  const left = createSpike(118.5, 120, 2500000, 1.5);
  const right = createSpike(121.5, 120, 2500000, 1.5);
  assert.ok(Math.abs(left - right) < 1e-6);
  // At 1 standard deviation (x - center = width), height * exp(-0.5)
  assert.ok(Math.abs(left - 2500000 * Math.exp(-0.5)) < 1e-3);
});

test('default simulation matches user Python script exact peaks and safety thresholds', () => {
  const points = generateSimulationData(DEFAULT_PARAMS);
  assert.equal(points.length, 301);

  // Check exact slot values:
  // 08:00 -> base traffic = 50,000
  assert.ok(Math.abs(points[0].currentLoad - 50000) < 1);
  assert.ok(Math.abs(points[0].proposedLoad - 50000) < 1);

  // 09:00 (idx 60) -> East Zone: 50,000 + 600,000 = 650,000
  assert.ok(Math.abs(points[60].currentLoad - 50000) < 1);
  assert.ok(Math.abs(points[60].proposedLoad - 650000) < 1);

  // 10:00 (idx 120) -> Current AC: 50,000 + 2,500,000 = 2,550,000 | West Zone: 50,000 + 700,000 = 750,000
  assert.ok(Math.abs(points[120].currentLoad - 2550000) < 1);
  assert.ok(Math.abs(points[120].proposedLoad - 750000) < 1);
  assert.equal(points[120].isCurrentCrash, true);
  assert.equal(points[120].isProposedCrash, false);

  // 11:00 (idx 180) -> Current Non-AC: 50,000 + 3,000,000 = 3,050,000 | North Zone: 50,000 + 750,000 = 800,000
  assert.ok(Math.abs(points[180].currentLoad - 3050000) < 1);
  assert.ok(Math.abs(points[180].proposedLoad - 800000) < 1);
  assert.equal(points[180].isCurrentCrash, true);
  assert.equal(points[180].isProposedCrash, false);

  // 12:00 (idx 240) -> South Zone: 50,000 + 650,000 = 700,000
  assert.ok(Math.abs(points[240].currentLoad - 50000) < 1);
  assert.ok(Math.abs(points[240].proposedLoad - 700000) < 1);

  const metrics = calculateMetrics(points, DEFAULT_PARAMS);
  assert.equal(Math.round(metrics.peakCurrentLoad), 3050000);
  assert.equal(metrics.peakCurrentTime, '11:00');
  assert.equal(Math.round(metrics.peakProposedLoad), 800000);
  assert.equal(metrics.peakProposedTime, '11:00');
  assert.equal(metrics.isProposedSafe, true);
  assert.equal(Math.round(metrics.headroomAtPeakProposed), 200000);
  assert.ok(metrics.currentOverloadMinutes > 0);
  assert.equal(metrics.proposedOverloadMinutes, 0);
});

test('generatePythonScript and generateCsvData output valid non-empty content', () => {
  const script = generatePythonScript(DEFAULT_PARAMS);
  assert.ok(script.includes("plt.savefig('zone_wise_graph.png', dpi=300)"));
  assert.ok(script.includes('2500000.0'));
  assert.ok(script.includes('3000000.0'));

  const points = generateSimulationData(DEFAULT_PARAMS);
  const csv = generateCsvData(points);
  const lines = csv.trim().split('\n');
  assert.equal(lines.length, 302); // 1 header + 301 rows
});
