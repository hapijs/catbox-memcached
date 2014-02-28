// Load modules

var Lab = require('lab');
var Catbox = require('catbox');
var Memcached = require('..');


// Declare internals

var internals = {};


// Test shortcuts

var expect = Lab.expect;
var before = Lab.before;
var after = Lab.after;
var describe = Lab.experiment;
var it = Lab.test;


describe('Memcache', function () {

    it('creates a new connection', function (done) {

        var client = new Catbox.Client(Memcached);
        client.start(function (err) {

            expect(client.isReady()).to.equal(true);
            done();
        });
    });

    it('closes the connection', function (done) {

        var client = new Catbox.Client(Memcached);
        client.start(function (err) {

            expect(client.isReady()).to.equal(true);
            client.stop();
            expect(client.isReady()).to.equal(false);
            done();
        });
    });

    it('gets an item after settig it', function (done) {

        var client = new Catbox.Client(Memcached);
        client.start(function (err) {

            var key = { id: 'x', segment: 'test' };
            client.set(key, '123', 500, function (err) {

                expect(err).to.not.exist;
                client.get(key, function (err, result) {

                    expect(err).to.equal(null);
                    expect(result.item).to.equal('123');
                    done();
                });
            });
        });
    });

    it('fails setting an item circular references', function (done) {

        var client = new Catbox.Client(Memcached);
        client.start(function (err) {

            var key = { id: 'x', segment: 'test' };
            var value = { a: 1 };
            value.b = value;
            client.set(key, value, 10, function (err) {

                expect(err.message).to.equal('Converting circular structure to JSON');
                done();
            });
        });
    });

    it('fails setting an item with very long ttl', function (done) {

        var client = new Catbox.Client(Memcached);
        client.start(function (err) {

            var key = { id: 'x', segment: 'test' };
            client.set(key, '123', Math.pow(2, 31), function (err) {

                expect(err.message).to.equal('Invalid ttl (greater than 2147483647)');
                done();
            });
        });
    });

    it('ignored starting a connection twice on same event', function (done) {

        var client = new Catbox.Client(Memcached);
        var x = 2;
        var start = function () {

            client.start(function (err) {

                expect(client.isReady()).to.equal(true);
                --x;
                if (!x) {
                    done();
                }
            });
        };

        start();
        start();
    });

    it('ignored starting a connection twice chained', function (done) {

        var client = new Catbox.Client(Memcached);
        client.start(function (err) {

            expect(err).to.not.exist;
            expect(client.isReady()).to.equal(true);

            client.start(function (err) {

                expect(err).to.not.exist;
                expect(client.isReady()).to.equal(true);
                done();
            });
        });
    });

    it('returns not found on get when using null key', function (done) {

        var client = new Catbox.Client(Memcached);
        client.start(function (err) {

            client.get(null, function (err, result) {

                expect(err).to.equal(null);
                expect(result).to.equal(null);
                done();
            });
        });
    });

    it('returns not found on get when item expired', function (done) {

        var client = new Catbox.Client(Memcached);
        client.start(function (err) {

            var key = { id: 'x', segment: 'test' };
            client.set(key, 'x', 1, function (err) {

                expect(err).to.not.exist;
                setTimeout(function () {

                    client.get(key, function (err, result) {

                        expect(err).to.equal(null);
                        expect(result).to.equal(null);
                        done();
                    });
                }, 2);
            });
        });
    });

    it('returns error on set when using null key', function (done) {

        var client = new Catbox.Client(Memcached);
        client.start(function (err) {

            client.set(null, {}, 1000, function (err) {

                expect(err instanceof Error).to.equal(true);
                done();
            });
        });
    });

    it('returns error on get when using invalid key', function (done) {

        var client = new Catbox.Client(Memcached);
        client.start(function (err) {

            client.get({}, function (err) {

                expect(err instanceof Error).to.equal(true);
                done();
            });
        });
    });

    it('returns error on drop when using invalid key', function (done) {

        var client = new Catbox.Client(Memcached);
        client.start(function (err) {

            client.drop({}, function (err) {

                expect(err instanceof Error).to.equal(true);
                done();
            });
        });
    });

    it('returns error on set when using invalid key', function (done) {

        var client = new Catbox.Client(Memcached);
        client.start(function (err) {

            client.set({}, {}, 1000, function (err) {

                expect(err instanceof Error).to.equal(true);
                done();
            });
        });
    });

    it('ignores set when using non-positive ttl value', function (done) {

        var client = new Catbox.Client(Memcached);
        client.start(function (err) {

            var key = { id: 'x', segment: 'test' };
            client.set(key, 'y', 0, function (err) {

                expect(err).to.not.exist;
                done();
            });
        });
    });

    it('returns error on drop when using null key', function (done) {

        var client = new Catbox.Client(Memcached);
        client.start(function (err) {

            client.drop(null, function (err) {

                expect(err instanceof Error).to.equal(true);
                done();
            });
        });
    });

    it('returns error on get when stopped', function (done) {

        var client = new Catbox.Client(Memcached);
        client.stop();
        var key = { id: 'x', segment: 'test' };
        client.connection.get(key, function (err, result) {

            expect(err).to.exist;
            expect(result).to.not.exist;
            done();
        });
    });

    it('returns error on set when stopped', function (done) {

        var client = new Catbox.Client(Memcached);
        client.stop();
        var key = { id: 'x', segment: 'test' };
        client.connection.set(key, 'y', 1, function (err) {

            expect(err).to.exist;
            done();
        });
    });

    it('returns error on drop when stopped', function (done) {

        var client = new Catbox.Client(Memcached);
        client.stop();
        var key = { id: 'x', segment: 'test' };
        client.connection.drop(key, function (err) {

            expect(err).to.exist;
            done();
        });
    });

    it('returns error on missing segment name', function (done) {

        var config = {
            expiresIn: 50000
        };
        var fn = function () {

            var client = new Catbox.Client(Memcached);
            var cache = new Catbox.Policy(config, client, '');
        };
        expect(fn).to.throw(Error);
        done();
    });

    it('returns error on bad segment name', function (done) {

        var config = {
            expiresIn: 50000
        };
        var fn = function () {

            var client = new Catbox.Client(Memcached);
            var cache = new Catbox.Policy(config, client, 'a\0b');
        };
        expect(fn).to.throw(Error);
        done();
    });

    it('returns error when cache item dropped while stopped', function (done) {

        var client = new Catbox.Client(Memcached);
        client.stop();
        client.drop('a', function (err) {

            expect(err).to.exist;
            done();
        });
    });

    it('throws an error if not created with new', function (done) {

        var fn = function () {

            var memcache = Memcached();
        };

        expect(fn).to.throw(Error);
        done();
    });

    describe('#constructor', function () {

        it('takes location as a string', function (done) {

            var options = {
                location: '127.0.0.1:11211'
            };

            var memcache = new Memcached(options);

            expect(memcache.settings.location).to.equal(options.location);
            done();
        });

        it('takes location as an array', function (done) {

            var options = {
                location: ['127.0.0.1:11211']
            };

            var memcache = new Memcached(options);

            expect(memcache.settings.location).to.deep.equal(options.location);
            done();
        });

        it('takes location as an object', function (done) {

            var options = {
                location: {
                    '127.0.0.1:11211': 1
                }
            };

            var memcache = new Memcached(options);

            expect(memcache.settings.location).to.deep.equal(options.location);
            done();
        });
    });

    describe('#start', function () {

        it('sets client to when the connection succeeds', function (done) {

            var options = {
                location: '127.0.0.1:11211'
            };

            var memcache = new Memcached(options);

            memcache.start(function (err, result) {

                expect(err).to.not.exist;
                expect(result).to.not.exist;
                expect(memcache.client).to.exist;
                done();
            });
        });

        it('reuses the client when a connection is already started', function (done) {

            var options = {
                location: '127.0.0.1:11211'
            };

            var memcache = new Memcached(options);

            memcache.start(function (err) {

                expect(err).to.not.exist;
                var client = memcache.client;

                memcache.start(function () {

                    expect(client).to.equal(memcache.client);
                    done();
                });
            });
        });

        it('returns an error when connection fails', function (done) {

            var options = {
                location: '127.0.0.1:11212',
                timeout: 10,
                idle: 10,
                failures: 0,
                retries: 0,
                poolSize: 1
            };

            var memcache = new Memcached(options);

            memcache.start(function (err, result) {

                expect(err).to.exist;
                expect(err).to.be.instanceOf(Error);
                expect(memcache.client).to.not.exist;
                done();
            });
        });

    });

    describe('#validateSegmentName', function () {

        it('returns an error when the name is empty', function (done) {

            var options = {
                location: '127.0.0.1:11211'
            };

            var memcache = new Memcached(options);

            var result = memcache.validateSegmentName('');

            expect(result).to.be.instanceOf(Error);
            expect(result.message).to.equal('Empty string');
            done();
        });

        it('returns an error when the name has a null character', function (done) {

            var options = {
                location: '127.0.0.1:11211'
            };

            var memcache = new Memcached(options);

            var result = memcache.validateSegmentName('\0test');

            expect(result).to.be.instanceOf(Error);
            done();
        });

        it('returns an error when the name has a space character', function (done) {

            var options = {
                location: '127.0.0.1:11211'
            };

            var memcache = new Memcached(options);

            var result = memcache.validateSegmentName(' test');

            expect(result).to.be.instanceOf(Error);
            done();
        });

        it('returns no error when the name has an "s" character', function (done) {

            var options = {
                location: '127.0.0.1:11211'
            };

            var memcache = new Memcached(options);

            var result = memcache.validateSegmentName('space');

            expect(result).to.not.exist;
            done();
        });

        it('returns an error when the name has a tab character', function (done) {

            var options = {
                location: '127.0.0.1:11211'
            };

            var memcache = new Memcached(options);

            var result = memcache.validateSegmentName('\ttest');

            expect(result).to.be.instanceOf(Error);
            done();
        });

        it('returns an error when the name has a newline character', function (done) {

            var options = {
                location: '127.0.0.1:11211'
            };

            var memcache = new Memcached(options);

            var result = memcache.validateSegmentName('\ntest');

            expect(result).to.be.instanceOf(Error);
            done();
        });

        it('returns null when there aren\'t any errors', function (done) {

            var options = {
                location: '127.0.0.1:11211'
            };

            var memcache = new Memcached(options);

            var result = memcache.validateSegmentName('valid');

            expect(result).to.not.be.instanceOf(Error);
            expect(result).to.equal(null);
            done();
        });
    });

    describe('#get', function () {

        it('passes an error to the callback when the connection is closed', function (done) {

            var options = {
                location: '127.0.0.1:11211'
            };

            var memcache = new Memcached(options);

            memcache.get('test', function (err) {

                expect(err).to.exist;
                expect(err).to.be.instanceOf(Error);
                expect(err.message).to.equal('Connection not started');
                done();
            });
        });

        it('passes an error to the callback when there is an error returned from getting an item', function (done) {

            var options = {
                location: '127.0.0.1:11211'
            };

            var memcache = new Memcached(options);
            memcache.client = {
                get: function (item, callback) {

                    callback(new Error());
                }
            };

            memcache.get('test', function (err) {

                expect(err).to.exist;
                expect(err).to.be.instanceOf(Error);
                done();
            });
        });

        it('passes an error to the callback when there is an error parsing the result', function (done) {

            var options = {
                location: '127.0.0.1:11211'
            };

            var memcache = new Memcached(options);
            memcache.client = {
                get: function (item, callback) {

                    callback(null, 'test');
                }
            };

            memcache.get('test', function (err) {

                expect(err).to.exist;
                expect(err.message).to.equal('Bad envelope content');
                done();
            });
        });

        it('passes an error to the callback when there is an error with the envelope structure', function (done) {

            var options = {
                location: '127.0.0.1:11211'
            };

            var memcache = new Memcached(options);
            memcache.client = {
                get: function (item, callback) {

                    callback(null, '{ "item": "false" }');
                }
            };

            memcache.get('test', function (err) {

                expect(err).to.exist;
                expect(err.message).to.equal('Incorrect envelope structure');
                done();
            });
        });

        it('is able to retrieve an object thats stored when connection is started', function (done) {

            var options = {
                location: '127.0.0.1:11211',
                partition: 'wwwtest'
            };
            var key = {
                id: 'test',
                segment: 'test'
            };

            var memcache = new Memcached(options);

            memcache.start(function () {

                memcache.set(key, 'myvalue', 200, function (err) {

                    expect(err).to.not.exist;
                    memcache.get(key, function (err, result) {

                        expect(err).to.not.exist;
                        expect(result.item).to.equal('myvalue');
                        done();
                    });
                });
            });
        });

        it('returns null when unable to find the item', function (done) {

            var options = {
                location: '127.0.0.1:11211',
                partition: 'wwwtest'
            };
            var key = {
                id: 'notfound',
                segment: 'notfound'
            };

            var memcache = new Memcached(options);

            memcache.start(function () {

                memcache.get(key, function (err, result) {

                    expect(err).to.not.exist;
                    expect(result).to.not.exist;
                    done();
                });
            });
        });
    });

    describe('#set', function () {

        it('passes an error to the callback when the connection is closed', function (done) {

            var options = {
                location: '127.0.0.1:11211'
            };

            var memcache = new Memcached(options);

            memcache.set('test1', 'test1', 3600, function (err) {

                expect(err).to.exist;
                expect(err).to.be.instanceOf(Error);
                expect(err.message).to.equal('Connection not started');
                done();
            });
        });

        it('passes an error to the callback when there is an error returned from setting an item', function (done) {

            var options = {
                location: '127.0.0.1:11211'
            };

            var memcache = new Memcached(options);
            memcache.client = {
                set: function (key, item, ttl, callback) {

                    callback(new Error());
                }
            };

            memcache.set('test', 'test', 3600, function (err) {

                expect(err).to.exist;
                expect(err).to.be.instanceOf(Error);
                done();
            });
        });
    });

    describe('#drop', function () {

        it('passes an error to the callback when the connection is closed', function (done) {

            var options = {
                location: '127.0.0.1:11211'
            };

            var memcache = new Memcached(options);

            memcache.drop('test2', function (err) {

                expect(err).to.exist;
                expect(err).to.be.instanceOf(Error);
                expect(err.message).to.equal('Connection not started');
                done();
            });
        });

        it('deletes the item from redis', function (done) {

            var options = {
                location: '127.0.0.1:11211'
            };

            var memcache = new Memcached(options);
            memcache.client = {
                del: function (key, callback) {

                    callback(null, null);
                }
            };

            memcache.drop('test', function (err) {

                expect(err).to.not.exist;
                done();
            });
        });
    });

    describe('#stop', function () {

        it('sets the client to null', function (done) {

            var options = {
                location: '127.0.0.1:11211'
            };

            var memcache = new Memcached(options);

            memcache.start(function () {

                expect(memcache.client).to.exist;
                memcache.stop();
                expect(memcache.client).to.not.exist;
                done();
            });
        });
    });
});
