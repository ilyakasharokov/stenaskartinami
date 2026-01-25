'use strict';

const { spawn } = require('child_process');

const child = spawn('npm', ['run', 'develop'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    IMPORT_V3_DUMP: 'true',
  },
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
