process.env.MONGO_URI ||= 'mongodb://127.0.0.1:27017/sharegrid';
process.env.JWT_SECRET ||= 'local-module-load-check-secret-32-characters';

require('../src/app');
console.log('ShareGrid API modules loaded successfully');
