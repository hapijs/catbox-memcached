'use strict';

const Hoek = require('@hapi/hoek');
const Boom = require('@hapi/boom');
const Bourne = require('@hapi/bourne');
const Memcache = require('memcached');


const internals = {
    defaults: {
        host: '127.0.0.1',
        port: 11211,
        timeout: 1000,
        idle: 1000
    }
};


exports.Engine = class CatboxMemcachedEngine {

    constructor(options = {}) {

        Hoek.assert(!(options.location && (options.host || options.port)), 'Cannot specify both location and host/port when using memcached');

        this.settings = Hoek.applyToDefaults(internals.defaults, options);

        if (!this.settings.location) {
            this.settings.location = `${this.settings.host}:${this.settings.port}`;
        }

        delete this.settings.port;
        delete this.settings.host;

        this._client = null;
        this.isConnected = false;
    }

    start() {

        if (this._client) {
            return;
        }

        this._client = new Memcache(this.settings.location, this.settings);

        return new Promise((resolve, reject) => {

            const server = this._client.servers[0];

            this._client.version((err) => {

                this._client.connections[server]?.removeListener('error', reject);

                if (err) {
                    return reject(err);
                }

                this.isConnected = true;
                resolve();
            });

            this._client.connections[server]?.once('error', reject);
        });
    }

    stop() {

        if (this._client) {
            this._client.end();
            this._client = null;
            this.isConnected = false;
        }
    }

    isReady() {

        return this.isConnected;
    }

    validateSegmentName(name) {

        if (!name) {
            throw new Boom.Boom('Empty string');
        }

        // https://github.com/memcached/memcached/blob/master/doc/protocol.txt#L44-L49

        if (name.indexOf('\0') !== -1) {
            throw new Boom.Boom('Includes null character');
        }

        if (name.match(/\s/g)) {
            throw new Boom.Boom('Includes spacing character(s)');
        }

        const { partition = '' } = this.settings;

        if (name.length + partition.length > 250) {
            throw new Boom.Boom('Segment and partition name lengths exceeds 250 characters');
        }

        return null;
    }

    get(key) {

        if (!this.isConnected) {
            return Promise.reject(new Boom.Boom('Connection is not ready'));
        }

        return new Promise((resolve, reject) => {

            this._client.get(this.generateKey(key), (err, result) => {

                if (err) {
                    return reject(err);
                }

                if (!result) {
                    return resolve(null);
                }

                try {
                    var envelope = Bourne.parse(result);
                }
                catch (err) {
                    return reject(new Boom.Boom('Bad envelope content'));
                }

                if (!envelope.item ||
                    !envelope.stored) {

                    return reject(new Boom.Boom('Incorrect envelope structure'));
                }

                resolve(envelope);
            });
        });
    }

    set(key, value, ttl) {

        if (!this.isConnected) {
            return Promise.reject(new Boom.Boom('Connection is not ready'));
        }

        const envelope = {
            item: value,
            stored: Date.now(),
            ttl
        };

        const cacheKey = this.generateKey(key);

        try {
            var stringifiedEnvelope = JSON.stringify(envelope);
        }
        catch (err) {
            return Promise.reject(new Boom.Boom(err.message));
        }

        const ttlSec = Math.max(1, Math.floor(ttl / 1000));

        return new Promise((resolve, reject) => {

            this._client.set(cacheKey, stringifiedEnvelope, ttlSec, (err) => {

                if (err) {
                    return reject(new Boom.Boom(err.message));
                }

                resolve();
            });
        });
    }

    drop(key) {

        if (!this.isConnected) {
            return Promise.reject(new Boom.Boom('Connection is not ready'));
        }

        return new Promise((resolve, reject) => {

            this._client.del(this.generateKey(key), (err) => {

                if (err) {
                    return reject(new Boom.Boom(err.message));
                }

                resolve();
            });
        });
    }

    generateKey(key) {

        const { partition = '' } = this.settings;
        const { segment, id } = key;
        let generatedKey = `${encodeURIComponent(segment)}:${encodeURIComponent(id)}`;

        if (partition !== '') {
            generatedKey = `${encodeURIComponent(partition)}:${generatedKey}`;
        }

        return generatedKey;
    }
};
