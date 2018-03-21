'use strict';

// Load modules

const { expect } = require('code');
const { describe, it } = exports.lab = require('lab').script();
const Catbox = require('catbox');
const Memcached = require('../');

describe('Memcached', () => {

    it('creates a new connection', async () => {
        const client = new Catbox.Client(Memcached);
        await client.start();

        expect(client.isReady()).to.equal(true);
    });

    it('closes the connection', async () => {
        const client = new Catbox.Client(Memcached);
        await client.start();

        expect(client.isReady()).to.equal(true);

        client.stop();
        expect(client.isReady()).to.equal(false);
    });

    it('gets an item after setting it', async () =>  {
        const client = new Catbox.Client(Memcached);
        await client.start();

        const key = { id: 'x', segment: 'test' };
        await client.set(key, '123', 500);

        const result = await client.get(key);
        expect(result.item).to.equal('123');
    });

    it('fails setting an item circular references', async () =>  {
        const client = new Catbox.Client(Memcached);
        await client.start();

        const key = { id: 'x', segment: 'test' };
        const value = { a: 1 };
        value.b = value;

        try {
            await client.set(key, value, 10);
        } catch (err) {
            expect(err.message).to.exist();
            expect(err.message).to.equal('Converting circular structure to JSON');
        }
    });

    it('fails setting an item with very long ttl', async () =>  {
        const client = new Catbox.Client(Memcached);
        await client.start();

        const key = { id: 'x', segment: 'test' };

        try {
            await client.set(key, '123', Math.pow(2, 31));
        } catch (err) {
            expect(err).to.exist();
            expect(err.message).to.equal('Invalid ttl (greater than 2147483647)');
        }
    });

    it('ignored starting a connection twice on same event', async () =>  {

        const client = new Catbox.Client(Memcached);

        const start = async () => {
            await client.start();
            expect(client.isReady()).to.equal(true);
        };

        start();
        start();
    });

    it('ignored starting a connection twice chained', async () => {
        const client = new Catbox.Client(Memcached);

        await client.start();
        expect(client.isReady()).to.equal(true);

        await client.start();
        expect(client.isReady()).to.equal(true);
    });

    it('returns not found on get when using null key', async () => {
        const client = new Catbox.Client(Memcached);
        await client.start();

        const result = await client.get(null);
        expect(result).to.equal(null);
    });

    it('returns not found on get when item expired', async () => {
        const client = new Catbox.Client(Memcached);
        await client.start();

        const key = { id: 'x', segment: 'test' };

        await client.set(key, 'x', 1);
        await new Promise((resolve) => {

            setTimeout(async () => {

                const result = await client.get(key);
                expect(result).to.equal(null);
                resolve();
            }, 2);
        });
    });

    it('returns error on set when using null key', async () => {
        const client = new Catbox.Client(Memcached);
        await client.start();

        await expect(client.set(null, {}, 1000)).to.reject();
    });

    it('returns error on get when using invalid key', async () => {
        const client = new Catbox.Client(Memcached);
        await client.start();

        await expect(client.get({})).to.reject();
    });

    it('returns error on drop when using invalid key', async () => {
        const client = new Catbox.Client(Memcached);
        await client.start();

        await expect(client.drop({})).to.reject();
    });

    it('returns error on set when using invalid key', async () => {
        const client = new Catbox.Client(Memcached);
        await client.start();

        await expect(client.set({}, {}, 1000)).to.reject();
    });

    it('ignores set when using non-positive ttl value', async () => {
        const client = new Catbox.Client(Memcached);
        await client.start();

        const key = { id: 'x', segment: 'test' };
        await client.set(key, 'y', 0);
    });

    it('returns error on drop when using null key', async () => {
        const client = new Catbox.Client(Memcached);
        await client.start();

        await expect(client.drop(null)).to.reject();
    });

    it('returns error on get when stopped', async () => {
        const client = new Catbox.Client(Memcached);
        client.stop();

        const key = { id: 'x', segment: 'test' };
        await expect(client.get(key)).to.reject();
    });

    it('returns error on set when stopped', async () => {
        const client = new Catbox.Client(Memcached);
        client.stop();

        const key = { id: 'x', segment: 'test' };
        await expect(client.set(key, 'y', 1)).to.reject();
    });

    it('returns error on drop when stopped', async () => {
        const client = new Catbox.Client(Memcached);
        client.stop();

        const key = { id: 'x', segment: 'test' };
        await expect(client.drop(key)).to.reject();
    });

    it('returns error on missing segment name', () => {
        const config = {
            expiresIn: 50000
        };

        const fn = () => {
            const client = new Catbox.Client(Memcached);
            new Catbox.Policy(config, client, '');
        };

        expect(fn).to.throw(Error);
    });

    it('returns error on bad segment name', () => {
        const config = {
            expiresIn: 50000
        };

        const fn = () => {
            const client = new Catbox.Client(Memcached);
            new Catbox.Policy(config, client, 'a\0b');
        };

        expect(fn).to.throw(Error);
    });

    it('returns error when cache item dropped while stopped', async () => {
        const client = new Catbox.Client(Memcached);
        client.stop();

        await expect(client.drop('a')).to.reject();
    });

    it('throws an error if not created with new', () => {
        const fn = () => {
            Memcached();
        };

        expect(fn).to.throw(Error);
    });

    describe('constructor()', () => {

        it('takes location as a string', async () =>  {
            const options = {
                location: '127.0.0.1:11211'
            };
            const memcache = new Memcached(options);

            expect(memcache.settings.location).to.equal(options.location);
        });

        it('takes location as an array', async () =>  {
            const options = {
                location: ['127.0.0.1:11211']
            };
            const memcache = new Memcached(options);

            expect(memcache.settings.location).to.equal(options.location);
        });

        it('takes location as an object', async () =>  {
            const options = {
                location: {
                    '127.0.0.1:11211': 1
                }
            };
            const memcache = new Memcached(options);

            expect(memcache.settings.location).to.equal(options.location);
        });

        it('supports using defaults if no options are passed in', async () =>  {
            let memcache = null;
            const fn = () => {
                memcache = new Memcached();
            };

            expect(fn).to.not.throw();
            expect(memcache.settings.location).to.equal('127.0.0.1:11211');
        });

        it('throws an error if given location and host/port', async () =>  {
            const fn = () => {
                new Memcached({
                    location: '127.0.0.1:11211',
                    host: '127.0.0.1',
                    port: 11211
                });
            };

            expect(fn).to.throw(Error);
        });

        it('throws an error if given location and host', async () =>  {
            const fn = () => {
                new Memcached({
                    location: '127.0.0.1:11211',
                    host: '127.0.0.1'
                });
            };

            expect(fn).to.throw(Error);
        });

        it('throws an error if given location and port', async () =>  {
            const fn = () => {
                new Memcached({
                    location: '127.0.0.1:11211',
                    port: 11211
                });
            };

            expect(fn).to.throw(Error);
        });

    });

    describe('start()', () => {

        it('sets client when the connection succeeds', async () =>  {
            const options = {
                location: '127.0.0.1:11211'
            };
            const memcache = new Memcached(options);

            await memcache.start();
            expect(memcache.client).to.exist();
        });

        it('sets isReady to true when the connection succeeds', async () => {
            const options = {
                location: '127.0.0.1:11211'
            };
            const memcache = new Memcached(options);

            await memcache.start();
            expect(memcache.isReady()).to.be.true();
        });

        it('reuses the client when a connection is already started', async () =>  {
            const options = {
                location: '127.0.0.1:11211'
            };

            const memcache = new Memcached(options);

            await memcache.start();

            const client = memcache.client;

            await memcache.start();
            expect(client).to.equal(memcache.client);
        });

    });

    describe('validateSegmentName()', () => {

        it('returns an error when the name is empty', async () =>  {
            const options = {
                location: '127.0.0.1:11211'
            };
            const memcache = new Memcached(options);

            expect(() => memcache.validateSegmentName('')).to.throw('Empty string');
        });

        it('returns an error when the name has a null character', async () =>  {
            const options = {
                location: '127.0.0.1:11211'
            };
            const memcache = new Memcached(options);

            expect(() => memcache.validateSegmentName('\0test')).to.throw();
        });

        it('returns an error when the name has a space character', async () =>  {
            const options = {
                location: '127.0.0.1:11211'
            };
            const memcache = new Memcached(options);

            expect(() => memcache.validateSegmentName(' test')).to.throw();
        });

        it('returns an error when the name has a tab character', async () =>  {
            const options = {
                location: '127.0.0.1:11211'
            };
            const memcache = new Memcached(options);

            expect(() => memcache.validateSegmentName('\ttest')).to.throw();
        });

        it('returns an error when the name has a new line character', async () =>  {
            const options = {
                location: '127.0.0.1:11211'
            };
            const memcache = new Memcached(options);

            expect(() => memcache.validateSegmentName('\ntest')).to.throw();
        });

        it('returns an error when the name is too long', () => {
            const options = {
                location: '127.0.0.1:11211'
            };
            const memcache = new Memcached(options);
            let tooLongName = "";

            for(; tooLongName.length < 300;) {
                tooLongName += Math.random().toString(36).substring(2, 15);
            }

            expect(() => memcache.validateSegmentName(tooLongName)).to.throw();
        });

        it('returns null when the name is valid', () => {
            const options = {
                location: '127.0.0.1:11211'
            };
            const memcache = new Memcached(options);

            expect(memcache.validateSegmentName('valid')).to.equal(null);
        });

    });

    describe('get()', () => {

        it('returns a rejected promise when the connection is closed', async () => {
            const options = {
                location: '127.0.0.1:11211'
            };
            const memcache = new Memcached(options);

            await expect(memcache.get('test')).to.reject('Connection is not ready');
        });

        it('returns a null item when it doesn\'t exist', async () => {
            const options = {
                location: '127.0.0.1:11211'
            };
            const memcache = new Memcached(options);

            await memcache.start();
            const result = await memcache.get('');

            expect(result).to.equal(null);
        });

        it('returns a rejected promise when there is an error returned from parsing the result', async () => {
            const options = {
                location: '127.0.0.1:11211'
            };
            const memcache = new Memcached(options);
            const key = {
                id: 'test',
                segment: 'test'
            };
            memcache.isConnected = true;

            memcache.methods = {
                get: (item) => {
                    return Promise.resolve('{"invalid": "json"')
                }
            };

            await expect(memcache.get(key)).to.reject('Bad envelope content');
        });

        it('returns a rejected promise when there is an error with the envelope structure', async () => {
            const options = {
                location: '127.0.0.1:11211'
            };
            const memcache = new Memcached(options);
            const key = {
                id: 'test',
                segment: 'test'
            };
            memcache.isConnected = true;

            memcache.methods = {
                get: (item) => {
                    return Promise.resolve('{"wrong": "structure"}')
                }
            };

            await expect(memcache.get(key)).to.reject('Incorrect envelope structure');
        });

        it('is able to retrieve an object that\'s stored when connection is started', async () => {
            const options = {
                location: '127.0.0.1:11211'
            };
            const memcache = new Memcached(options);
            const key = {
                id: 'test',
                segment: 'test'
            };

            await memcache.start();
            await memcache.set(key, 'myValue', 200);
            const result = await memcache.get(key);

            expect(result.item).to.equal('myValue');
        });

    });

    describe('set()', () => {

        it('returns a rejected promise when the connection is closed', async () => {
            const options = {
                location: '127.0.0.1:11211'
            };
            const memcache = new Memcached(options);
            const key = {
                id: 'test',
                segment: 'test'
            };

            await expect(memcache.set(key, 'test1', 3600)).to.reject('Connection is not ready');
        });

        it('returns a rejected promise when there is an error returned from setting an item', async () => {
            const options = {
                location: '127.0.0.1:11211'
            };
            const memcache = new Memcached(options);
            const key = {
                id: 'test',
                segment: 'test'
            };
            memcache.isConnected = true;

            memcache.methods = {
                set: (key, value, ttl) => {
                    throw new Error('test');
                }
            };

            await expect(memcache.set(key, true, 0)).to.reject('test');
        });

        it('doesn\'t return an error when the set succeeds', async () => {
            const options = {
                location: '127.0.0.1:11211'
            };
            const memcache = new Memcached(options);
            const key = {
                id: 'test',
                segment: 'test'
            };

            await memcache.start();
            const result = await memcache.set(key, 'test1', 3600);

            expect(result).to.not.exist();
        });

    });

    describe('drop()', () => {

        it('returns a rejected promise when the connection is closed', async () => {
            const options = {
                location: '127.0.0.1:11211'
            };
            const memcache = new Memcached(options);
            const key = {
                id: 'test',
                segment: 'test'
            };

            await expect(memcache.drop(key)).to.reject('Connection is not ready');
        });

        it('doesn\'t return an error when the drop succeeds', async () => {
            const options = {
                location: '127.0.0.1:11211'
            };
            const memcache = new Memcached(options);
            const key = {
                id: 'test',
                segment: 'test'
            };

            await memcache.start();
            const result = await memcache.drop(key);

            expect(result).to.not.exist();
        });

        it('returns a rejected promise when there is an error returned from dropping an item', async () => {
            const options = {
                location: '127.0.0.1:11211'
            };
            const memcache = new Memcached(options);
            const key = {
                id: 'test',
                segment: 'test'
            };
            memcache.isConnected = true;

            memcache.methods = {
                del: (key, value, ttl) => {
                    throw new Error('test');
                }
            };

            await expect(memcache.drop(key)).to.reject('test');
        });

    });

    describe('stop()', () => {

        it('sets the client to null', async () => {
            const options = {
                location: '127.0.0.1:11211'
            };
            const memcache = new Memcached(options);

            await memcache.start();
            memcache.stop();

            expect(memcache.client).to.be.equal(null);
        });

    });

});
