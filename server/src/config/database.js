const mongoose = require('mongoose');
const env = require('./env');

async function connectDatabase() {
  mongoose.set('strictQuery', true);
  console.info('[db-startup-diagnostic]', {
    processMongoUriDefined: typeof process.env.MONGO_URI === 'string' && process.env.MONGO_URI.length > 0,
    envMongoUriDefined: typeof env.mongoUri === 'string' && env.mongoUri.length > 0,
    entryPoint: require.main?.filename || process.argv[1]
  });
  await mongoose.connect(env.mongoUri);
}

module.exports = connectDatabase;
