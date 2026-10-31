const mongoose = require('mongoose');
const env = require('./env');

function getTlsDiagnostics(uri) {
  const query = typeof uri === 'string' ? uri.split('?')[1]?.split('#')[0] || '' : '';
  const params = new URLSearchParams(query);
  const tlsValues = params.getAll('tls');
  const sslValues = params.getAll('ssl');
  const validBooleanValues = (values) => values.every((value) => value === 'true' || value === 'false');

  return {
    tlsOptionPresent: tlsValues.length > 0,
    tlsOptionOccurrences: tlsValues.length,
    tlsOptionValuesValid: validBooleanValues(tlsValues),
    sslOptionPresent: sslValues.length > 0,
    sslOptionOccurrences: sslValues.length,
    sslOptionValuesValid: validBooleanValues(sslValues)
  };
}

async function connectDatabase() {
  mongoose.set('strictQuery', true);
  console.info('[db-startup-diagnostic]', {
    processMongoUriDefined: typeof process.env.MONGO_URI === 'string' && process.env.MONGO_URI.length > 0,
    envMongoUriDefined: typeof env.mongoUri === 'string' && env.mongoUri.length > 0,
    ...getTlsDiagnostics(env.mongoUri),
    entryPoint: require.main?.filename || process.argv[1]
  });
  await mongoose.connect(env.mongoUri);
}

module.exports = connectDatabase;
