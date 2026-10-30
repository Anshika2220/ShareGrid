const app = require('./app');
const connectDatabase = require('./config/database');
const env = require('./config/env');

async function start() {
  await connectDatabase();
  const server = app.listen(env.port, () => {
    console.log(`ShareGrid API listening on port ${env.port}`);
  });
  const shutdown = (signal) => {
    console.log(`${signal} received; closing HTTP server`);
    server.close(async (error) => {
      if (error) {
        console.error(error);
        process.exitCode = 1;
      }
      const mongoose = require('mongoose');
      await mongoose.disconnect();
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error) => {
  console.error('Unable to start ShareGrid API', error);
  process.exitCode = 1;
});
