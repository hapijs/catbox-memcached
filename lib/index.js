'use strict';

const Hoek = require('@hapi/hoek');
const Bourne = require('@hapi/bourne');
const { MemcacheClient } = require('memcache-client');


const internals = {
    defaults: {
        host: '127.0.0.1',
        port: 11211,
        cmdTimeout: 1000,
        Promise
    }
};


exports.Engine = class CatboxMemcachedEngine {

    constructor(options = {}) {

        Hoek.assert(!(options.server && (options.host || options.port)), 'Cannot specify both server and host/port when using memcached');

        this.settings = Hoek.applyToDefaults(internals.defaults, options);

        if (!this.settings.server) {
            this.settings.server = `${this.settings.host}:${this.settings.port}`;
        }

        delete this.settings.port;
        delete this.settings.host;

        this._client = null;
        this.isConnected = false;
    }

    async start() {

        if (this._client) {
            return;
        }

        this._client = new MemcacheClient(this.settings);

        await this._client.version();
        this.isConnected = true;
    }

    stop() {

        if (this._client) {
            this._client.shutdown();
            this._client = null;
            this.isConnected = false;
        }
    }

    isReady() {

        return this.isConnected;
    }

    validateSegmentName(name) {

        if (!name) {
            throw new Error('Empty string');
        }

        // https://github.com/memcached/memcached/blob/master/doc/protocol.txt#L44-L49

        if (name.indexOf('\0') !== -1) {
            throw new Error('Includes null character');
        }

        if (name.match(/\s/g)) {
            throw new Error('Includes spacing character(s)');
        }

        const { partition = '' } = this.settings;

        if (name.length + partition.length > 250) {
            throw new Error('Segment and partition name lengths exceeds 250 characters');
        }

        return null;
    }

    async get(key) {

        this.#assertConnected();

        const result = await this._client.get(this.generateKey(key));

        if (!result) {
            return null;
        }

        try {
            var envelope = Bourne.parse(result.value);
        }
        catch (err) {
            throw new Error('Bad envelope content');
        }

        if (!envelope.item ||
            !envelope.stored) {

            throw new Error('Incorrect envelope structure');
        }

        return envelope;
    }

    async set(key, value, ttl) {

        this.#assertConnected();

        const envelope = {
            item: value,
            stored: Date.now(),
            ttl
        };

        const cacheKey = this.generateKey(key);
        const stringifiedEnvelope = JSON.stringify(envelope);
        const ttlSec = Math.max(1, Math.floor(ttl / 1000));

        await this._client.set(cacheKey, stringifiedEnvelope, { lifetime: ttlSec });
    }

    async drop(key) {

        this.#assertConnected();

        await this._client.delete(this.generateKey(key));
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

    #assertConnected() {

        Hoek.assert(this.isConnected, 'Connection is not ready');
    }
};
