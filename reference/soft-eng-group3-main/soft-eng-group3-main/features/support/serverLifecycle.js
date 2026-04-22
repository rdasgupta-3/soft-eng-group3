const { BeforeAll, AfterAll } = require('@cucumber/cucumber');
const { spawn } = require('child_process');
const path = require('path');

let serverProcess = null;

function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '..', '..', 'server.js');
    serverProcess = spawn('node', [serverPath], {
      cwd: path.join(__dirname, '..', '..'),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const onData = data => {
      const text = data.toString();
      process.stdout.write(text);
      if (text.includes('Server running at')) {
        cleanup();
        resolve();
      }
    };

    const onError = error => {
      cleanup();
      reject(error);
    };

    const onExit = code => {
      cleanup();
      reject(new Error(`Server exited with code ${code}`));
    };

    const cleanup = () => {
      if (serverProcess) {
        serverProcess.stdout.off('data', onData);
        serverProcess.stderr.off('data', onError);
        serverProcess.off('exit', onExit);
        serverProcess.off('error', onError);
      }
    };

    serverProcess.stdout.on('data', onData);
    serverProcess.stderr.on('data', chunk => process.stderr.write(chunk));
    serverProcess.on('error', onError);
    serverProcess.on('exit', onExit);

    setTimeout(() => {
      cleanup();
      resolve();
    }, 2000);
  });
}

BeforeAll(async function () {
  if (!serverProcess) {
    await startServer();
  }
});

AfterAll(async function () {
  if (!serverProcess) {
    return;
  }

  if (serverProcess.exitCode !== null) {
    serverProcess = null;
    return;
  }

  await new Promise(resolve => {
    serverProcess.once('exit', () => resolve());
    serverProcess.kill();
  });

  serverProcess = null;
});
