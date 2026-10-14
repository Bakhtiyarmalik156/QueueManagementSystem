const http = require('http');
const { createApp } = require('./app');
const { init } = require('./socket');
const config = require('./config');
const prisma = require('./db');

async function main() {
  await prisma.$connect();
  const app = createApp();
  const server = http.createServer(app);
  init(server);

  server.listen(config.port, () => {
    console.log(`QMS backend running on http://localhost:${config.port}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});