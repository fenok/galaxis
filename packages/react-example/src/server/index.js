const path = require('path');
const express = require('express');
const ssrMiddleware = require('../../dist/server.bundle').default;

const users = {
    1: {
        id: 1,
        name: 'User 1',
        username: 'user1',
        email: 'mail@user1.com',
    },
    2: {
        id: 2,
        name: 'User 2',
        username: 'user2',
        email: 'mail@user2.com',
    },
};

const app = express();

app.use(express.json());

app.get('/api/users/:id', (req, res) => {
    const user = users[req.params.id];
    if (user) {
        res.send(user);
    } else {
        res.status(404).send({ code: 404 });
    }
});

app.post('/api/users/:id', (req, res) => {
    if (users[req.params.id]) {
        users[req.params.id] = { ...users[req.params.id], ...req.body };

        res.send(users[req.params.id]);
    } else {
        res.status(404).send({ code: 404 });
    }
});

app.use(express.static(path.resolve(__dirname, '..', '..', 'dist', 'static')));
app.use(ssrMiddleware);

app.listen(3001);
console.log('Listen at http://localhost:3001');
