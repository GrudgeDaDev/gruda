const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing ${scriptPath}:`, error);
        reject(error);
      } else {
        console.log(`Output of ${scriptPath}:`, stdout);
        resolve(stdout);
      }
    });
  });
}

async function runAllSystems() {
  const scriptsDir = path.join(__dirname, 'systems');
  const scriptFiles = fs.readdirSync(scriptsDir).filter(file => file.endsWith('.js'));

  for (const file of scriptFiles) {
    const scriptPath = path.join(scriptsDir, file);
    try {
      await runScript(scriptPath);
    } catch (error) {
      console.error(`Failed to run ${file}:`, error);
    }
  }

  console.log('All systems have been run successfully.');
}

runAllSystems();
