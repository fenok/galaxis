const path = require('path');
const express = require('express');
const ssrMiddleware = require('../../dist/server.bundle').default;

const app = express();

app.use(express.static(path.resolve(__dirname, '..', '..', 'dist', 'static')));
app.use(ssrMiddleware);

app.listen(3001);
console.log('Listen at http://localhost:3001');
