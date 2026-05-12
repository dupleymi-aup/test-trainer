const { execSync } = require('child_process');

// Find available port
const port = execSync('node find-port.js', { encoding: 'utf8' }).trim();

console.log(`Starting dev server on port ${port}...`);

// Run next dev on that port
execSync(`npx next dev -p ${port}`, { stdio: 'inherit', env: { ...process.env, PORT: port } });
