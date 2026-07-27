const fs = require('fs');
const state = JSON.parse(fs.readFileSync('../MechLex_Shared_Data_Simulation/state.json', 'utf8'));
const emptyTerms = [];
for (const domain of state.data) {
  for (const item of domain.items) {
    if (!item.title || item.title.trim() === '' || item.title.trim() === '-') {
      emptyTerms.push(item);
    }
  }
}
console.log('Empty terms:', emptyTerms);
