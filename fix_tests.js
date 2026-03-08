const fs = require('fs');

const files = [
  'packages/server/tests/engine/deterministic.test.ts',
  'packages/server/tests/engine/events.test.ts',
  'packages/server/tests/engine/monteCarlo.test.ts',
  'packages/server/tests/engine/simulator.test.ts',
  'packages/server/tests/engine/stress.test.ts',
  'packages/server/tests/routes/simulation.test.ts',
  'packages/server/tests/routes/stress.test.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace assignments
  content = content.replace(/config\.coreParams\.retirementDuration = (\d+);/g, 'config.coreParams.portfolioEnd = { month: 1, year: 2030 + $1 };');
  content = content.replace(/request\.config\.coreParams\.retirementDuration = (\d+);/g, 'request.config.coreParams.portfolioEnd = { month: 1, year: 2030 + $1 };');
  content = content.replace(/config\.coreParams\.withdrawalsStartAt = \d+;\n/g, '');
  content = content.replace(/config\.coreParams\.startingAge = \d+;\n/g, '');
  
  // Replace startYear/endYear
  content = content.replace(/startYear: 1,/g, 'start: { month: 1, year: 2030 },');
  content = content.replace(/startYear: 2,/g, 'start: { month: 1, year: 2031 },');
  content = content.replace(/endYear: (\d+),/g, 'end: { month: 1, year: 2029 + $1 },');
  content = content.replace(/endYear: configWithWidePhase\.coreParams\.retirementDuration,/g, 'end: configWithWidePhase.coreParams.portfolioEnd,');
  
  // Replace reading duration
  content = content.replace(/config\.coreParams\.retirementDuration \* 12/g, '((config.coreParams.portfolioEnd.year - config.coreParams.portfolioStart.year) * 12 + (config.coreParams.portfolioEnd.month - config.coreParams.portfolioStart.month))');
  content = content.replace(/base\.coreParams\.retirementDuration \* 12/g, '((base.coreParams.portfolioEnd.year - base.coreParams.portfolioStart.year) * 12 + (base.coreParams.portfolioEnd.month - base.coreParams.portfolioStart.month))');
  
  fs.writeFileSync(file, content);
}
console.log('Done');
