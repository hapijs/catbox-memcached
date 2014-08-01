catbox-memcached
================

Memcached adapter for catbox

| Lead Maintainer  |
|:-:|
|[chapel](https://github.com/chapel)|
|![chapel](https://secure.gravatar.com/avatar/ca110906db339eedf92fda2407701fc4?s=128)|

### Options

- `host` - the Memcache server hostname. Defaults to '`127.0.0.1'`. Cannot be used with `location`.
- `port` - the Memcache server port. Defaults to `11211`. Cannot be used with `location`.
- `location` - the Memcache server hostname and port. Defaults to ''127.0.0.1:11211''. Can be a String,
  Array, or an Object as per [node-memcached location specification](https://github.com/3rd-Eden/node-memcached#server-locations).
