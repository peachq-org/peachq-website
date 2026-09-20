const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// These remain runnable q files: expected console lines are ordinary comments.
function readCases(file) {
  const cases = [];
  fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n').forEach((line, index) => {
    const marker = line.trimStart();
    if (marker.startsWith('/=>')) {
      assert(cases.length, `${file}:${index + 1}: expected output without a command`);
      assert(/^\/=>($| )/.test(marker), `${file}:${index + 1}: use /=> followed by a space or end of line`);
      cases.at(-1).expected.push(marker.slice(4));
    } else if (line.trim() && !line.trimStart().startsWith('/')) {
      cases.push({command: line.trim(), expected: [], line: index + 1});
    }
  });
  assert(cases.length, `${file}: no q commands`);
  return cases;
}

async function checkCommand(page, command, expected, label = command) {
  const output = page.locator('#replOutput > div');
  const start = await output.count();
  await page.locator('#replInput').fill(command);
  // The console's Enter handler runs q synchronously, including printed output.
  await page.locator('#replInput').press('Enter');
  const entries = (await output.allTextContents()).slice(start);
  assert.equal(entries.shift(), 'q)' + command, `${label}: console prompt`);
  assert.equal(entries.join('\n'), expected, `${label}: console output`);
}

async function checkQFiles(page, directory = path.join(__dirname, 'repl')) {
  const files = fs.readdirSync(directory).filter(file => file.endsWith('.q')).sort();
  assert(files.length, `No .q tests in ${directory}`);
  let count = 0;
  for (const file of files) {
    for (const test of readCases(path.join(directory, file))) {
      await checkCommand(page, test.command, test.expected.join('\n'),
        `${file}:${test.line} (${test.command})`);
      count++;
    }
  }
  console.log(`${files.length} q files, ${count} commands passed in one REPL session`);
}

module.exports = {checkCommand, checkQFiles};
