catbox-memcached
================

Memcached adapter for catbox

[![Build Status](https://secure.travis-ci.org/hapijs/catbox-memcached.png)](http://travis-ci.org/hapijs/catbox-memcached)

Lead Maintainer: [Jacob Chapel](https://github.com/chapel)

### Options

- `host` - the Memcache server hostname. Defaults to '`127.0.0.1'`. Cannot be used with `location`.
- `port` - the Memcache server port. Defaults to `11211`. Cannot be used with `location`.
- `location` - the Memcache server hostname and port. Defaults to ''127.0.0.1:11211''. Can be a String,
  Array, or an Object as per [node-memcached location specification](https://github.com/3rd-Eden/node-memcached#server-locations).
