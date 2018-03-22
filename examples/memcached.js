'use strict';

// After starting this example load http://localhost:8080 and hit refresh.
// You will notice that it loads the response from cache
// for the first 5 seconds and then reloads the cache

// Load modules
const Catbox = require('catbox');
const Http = require('http');


// Declare internals
const internals = {};

internals.handler = async (req, res) => {

    try {
        const item = await internals.getResponse();
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(item);
    }
    catch (ignoreErr) {
        res.writeHead(500);
        res.end();
    }
};


internals.getResponse = async () => {

    const key = {
        segment: 'example',
        id: 'myExample'
    };

    const cacheValue = 'my example';
    const ttl = 10000; // How long item will be cached in milliseconds

    const cached = await internals.client.get(key);

    if (cached) {
        return `From cache: ${cached.item}`;
    }

    await internals.client.set(key, cacheValue, ttl);

    return cacheValue;
};

internals.startCache = async () => {

    const options = {
        partition: 'examples',
        location: '127.0.0.1:11211'
    };
    try {
        internals.client = new Catbox.Client(require('../'), options);  // Replace require('../') with 'catbox-memcached' in your own code
        await internals.client.start();
    }
    catch (error) {
        console.log('error');
        console.log(error);
        process.exit();
    }
};

internals.startServer = () => {

    const server = Http.createServer(internals.handler);
    server.listen(8080);
};

(async () => {

    await internals.startCache();
    internals.startServer();
    console.log('Server started at http://localhost:8080/');
})();

// In case you face unhandled rejection errors
process.on('unhandledRejection', (error) => {

    console.log(error);
    process.exit();
});
