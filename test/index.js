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

    });

});


//     it('returns null when there aren\'t any errors', async () =>  {
//
//         var options = {
//             location: '127.0.0.1:11211'
//         };
//
//         var memcache = new Memcached(options);
//
//         var result = memcache.validateSegmentName('valid');
//
//         expect(result).to.not.be.instanceOf(Error);
//         expect(result).to.equal(null);
//         done();
//     });
// });
//
// describe('get()', function () {
//
//     it('passes an error to the callback when the connection is closed', async () =>  {
//
//         var options = {
//             location: '127.0.0.1:11211'
//         };
//
//         var memcache = new Memcached(options);
//
//         memcache.get('test', function (err) {
//
//             expect(err).to.exist();
//             expect(err).to.be.instanceOf(Error);
//             expect(err.message).to.equal('Connection not started');
//             done();
//         });
//     });
//
//     it('passes an error to the callback when there is an error returned from getting an item', async () =>  {
//
//         var options = {
//             location: '127.0.0.1:11211'
//         };
//
//         var memcache = new Memcached(options);
//         memcache.client = {
//             get: function (item, callback) {
//
//                 callback(new Error());
//             }
//         };
//
//         memcache.get('test', function (err) {
//
//             expect(err).to.exist();
//             expect(err).to.be.instanceOf(Error);
//             done();
//         });
//     });
//
//     it('passes an error to the callback when there is an error parsing the result', async () =>  {
//
//         var options = {
//             location: '127.0.0.1:11211'
//         };
//
//         var memcache = new Memcached(options);
//         memcache.client = {
//             get: function (item, callback) {
//
//                 callback(null, 'test');
//             }
//         };
//
//         memcache.get('test', function (err) {
//
//             expect(err).to.exist();
//             expect(err.message).to.equal('Bad envelope content');
//             done();
//         });
//     });
//
//     it('passes an error to the callback when there is an error with the envelope structure', async () =>  {
//
//         var options = {
//             location: '127.0.0.1:11211'
//         };
//
//         var memcache = new Memcached(options);
//         memcache.client = {
//             get: function (item, callback) {
//
//                 callback(null, '{}');
//             }
//         };
//
//         memcache.get('test', function (err) {
//
//             expect(err).to.exist();
//             expect(err.message).to.equal('Incorrect envelope structure');
//             done();
//         });
//     });
//
//     it('is able to retrieve an object thats stored when connection is started', async () =>  {
//
//         var options = {
//             location: '127.0.0.1:11211',
//             partition: 'wwwtest'
//         };
//         var key = {
//             id: 'test',
//             segment: 'test'
//         };
//
//         var memcache = new Memcached(options);
//
//         memcache.start(function () {
//
//             memcache.set(key, 'myvalue', 200, function (err) {
//
//                 expect(err).to.not.exist();
//                 memcache.get(key, function (err, result) {
//
//                     expect(err).to.not.exist();
//                     expect(result.item).to.equal('myvalue');
//                     done();
//                 });
//             });
//         });
//     });
//
//     it('returns null when unable to find the item', async () =>  {
//
//         var options = {
//             location: '127.0.0.1:11211',
//             partition: 'wwwtest'
//         };
//         var key = {
//             id: 'notfound',
//             segment: 'notfound'
//         };
//
//         var memcache = new Memcached(options);
//
//         memcache.start(function () {
//
//             memcache.get(key, function (err, result) {
//
//                 expect(err).to.not.exist();
//                 expect(result).to.not.exist();
//                 done();
//             });
//         });
//     });
// });
//
// describe('set()', function () {
//
//     it('passes an error to the callback when the connection is closed', async () =>  {
//
//         var options = {
//             location: '127.0.0.1:11211'
//         };
//
//         var memcache = new Memcached(options);
//
//         memcache.set('test1', 'test1', 3600, function (err) {
//
//             expect(err).to.exist();
//             expect(err).to.be.instanceOf(Error);
//             expect(err.message).to.equal('Connection not started');
//             done();
//         });
//     });
//
//     it('passes an error to the callback when there is an error returned from setting an item', async () =>  {
//
//         var options = {
//             location: '127.0.0.1:11211'
//         };
//
//         var memcache = new Memcached(options);
//         memcache.client = {
//             set: function (key, item, ttl, callback) {
//
//                 callback(new Error());
//             }
//         };
//
//         memcache.set('test', 'test', 3600, function (err) {
//
//             expect(err).to.exist();
//             expect(err).to.be.instanceOf(Error);
//             done();
//         });
//     });
// });
//
// describe('drop()', function () {
//
//     it('passes an error to the callback when the connection is closed', async () =>  {
//
//         var options = {
//             location: '127.0.0.1:11211'
//         };
//
//         var memcache = new Memcached(options);
//
//         memcache.drop('test2', function (err) {
//
//             expect(err).to.exist();
//             expect(err).to.be.instanceOf(Error);
//             expect(err.message).to.equal('Connection not started');
//             done();
//         });
//     });
//
//     it('deletes the item from redis', async () =>  {
//
//         var options = {
//             location: '127.0.0.1:11211'
//         };
//
//         var memcache = new Memcached(options);
//         memcache.client = {
//             del: function (key, callback) {
//
//                 callback(null, null);
//             }
//         };
//
//         memcache.drop('test', function (err) {
//
//             expect(err).to.not.exist();
//             done();
//         });
//     });
// });
//
// describe('stop()', function () {
//
//     it('sets the client to null', async () =>  {
//
//         var options = {
//             location: '127.0.0.1:11211'
//         };
//
//         var memcache = new Memcached(options);
//
//         memcache.start(function () {
//
//             expect(memcache.client).to.exist();
//             memcache.stop();
//             expect(memcache.client).to.not.exist();
//             done();
//         });
//     });
// });
