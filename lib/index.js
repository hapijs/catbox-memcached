'use strict';

// Load modules

const { promisify } = require('util');
const Memcache = require('memcached');
const Hoek = require('hoek');
const Boom = require('boom');

const getSettings = (options) => {
    Hoek.assert(
        !(options.location && (options.host || options.port)),
        'Cannot specify both location and host/port when using memcached'
    );

    const settings = Hoek.applyToDefaults({
        host: '127.0.0.1',
        port: 11211
    }, options);

    settings.location = settings.location || `${settings.host}:${settings.port}`;
    delete settings.port;
    delete settings.host;

    return settings;
};

const promisifyMethod = (method, instance) => {
    if (typeof instance[method] !== 'function') {
        throw new Boom(`Method ${method} doesn't exists`);
    }

    return promisify(instance[method]).bind(instance);
};

const connect = (settings) => {
    return new Memcache(settings.location, settings);
};

const testConnection = async(settings) => {
    const testSettings = {
        timeout: settings.timeout || 1000,
        idle: settings.idle || 1000,
        failures: 0,
        retries: 0,
        poolsize: 1
    };

    const testConnection = connect(testSettings);
    const pGet = promisifyMethod('get', testConnection);

    return await pGet('foobar')
        .then(() => {})
        .catch(error => {
            testConnection.end();
            throw new Boom(error);
        });
};

exports = module.exports = class Connection {
    constructor(options) {
        options = options || {};

        Hoek.assert(this instanceof Connection, 'Memcached cache client must be instantiated using new');

        this.settings = getSettings(options);
        this.client = null;
        this.isConnected = false;
        this.methods = {};

        return this;
    }

    async start() {
        if (this.client) {
            return;
        }

        try {
            await testConnection(this.settings);
            this.client = connect(this.settings);
            this.isConnected = true;
            this.methods.get = promisifyMethod('get', this.client);
            this.methods.set = promisifyMethod('set', this.client);
            this.methods.del = promisifyMethod('del', this.client);
        }
        catch (error) {
            throw error;
        }
    }

    stop() {
        if (this.client) {
            this.client.end();
            this.client = null;
            this.isConnected = false;
        }
    }

    isReady() {
        return this.isConnected;
    }

    validateSegmentName(name) {

        if (!name) {
            throw new Boom('Empty string');
        }

        // https://github.com/memcached/memcached/blob/master/doc/protocol.txt#L44-L49
        // ---------------------------------------------------------------------------
        if (name.indexOf('\0') !== -1) {
            throw new Boom('Includes null character');
        }

        if (name.match(/\s/g)) {
            throw new Boom('Includes space character');
        }

        const { partition = '' } = this.settings.partition;

        if (name.length + partition.length > 250) {
            throw new Boom('Segment and partition name lengths exceeds 250 characters');
        }
        // ---------------------------------------------------------------------------

        return null;
    }

    async get(key) {
        if (!this.isConnected) {
            throw new Boom('Connection is not ready');
        }

        return await this.methods.get(this.generateKey(key))
            .then((result) => {
                if (!result) {
                    return null;
                }

                const envelope = JSON.parse(result);

                if (!envelope) {
                    throw new Boom('Bad envelope content');
                }

                if (!envelope.item || !envelope.stored) {
                    throw new Boom('Incorrect envelope structure');
                }

                return envelope;
            })
            .catch(error => {
                throw error;
            });
    }

    async set(key, value, ttl) {
        if (!this.isConnected) {
            throw new Boom('Connection is not ready');
        }

        const envelope = {
            item: value,
            stored: Date.now(),
            ttl: ttl
        };
        const cacheKey = this.generateKey(key);

        let stringifiedEnvelope = null;

        try {
            stringifiedEnvelope = JSON.stringify(envelope);
        }
        catch (err) {
            throw new Boom(err.message);
        }

        const ttlSec = Math.max(1, Math.floor(ttl / 1000));

        return await this.methods.set(cacheKey, stringifiedEnvelope, ttlSec)
            .then(() => {
            })
            .catch(error => {
                throw new Boom(error.message);
            });
    }

    async drop(key) {
        if (!this.isConnected) {
            throw new Boom('Connection is not ready');
        }

        return await this.methods.del(this.generateKey(key))
            .then(() => {
            })
            .catch(error => {
                throw new Boom(error.message);
            });
    };

    generateKey(key) {
        const { partition = '' } = this.settings;
        const { segment, id } = key;
        let generatedKey = `${encodeURIComponent(segment)}:${encodeURIComponent(id)}`;

        if (partition !== '') {
            generatedKey = `${encodeURIComponent(partition)}:${generatedKey}`;
        }

        return generatedKey;
    };
};
