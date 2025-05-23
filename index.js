"use strict";

var { LRUCache } = require('lru-cache');
var sigmund = require('sigmund');

const UNDEFINED_VALUE_SIGIL = Symbol('obcache_undefined_value');

function keygen(name,args) {
  var input = { f: name, a: args };
  return sigmund(input,4);
}

var cache = {

  /**
   * ## cache.Create
   *
   * Constructor
   *
   * Creates a new instance with its own LRU Cache
   *
   * @param {Object} LRU Options
   *
   **/
  Create: function(userOptions) {
    let lruOptions = userOptions;
    if (!userOptions || (userOptions.max === undefined && userOptions.maxSize === undefined && userOptions.ttl === undefined)) {
      lruOptions = userOptions ? { ...userOptions } : {}; // Shallow copy if userOptions exists
      lruOptions.max = 1000; // Default max if no size/ttl option is set
    }
    var lru = new LRUCache(lruOptions);
    var anonFnId = 0;
    this.lru = lru;
    /**
    *
    * ## cache.wrap
    *
    * @param {Function} function to be wrapped
    * @param {Object} this object for the function being wrapped. Optional
    * @return {Function} Wrapped function that is cache aware
    *
    * Workhorse
    *
    * Given a function, generates a cache aware version of it.
    * The given function must have a callback as its last argument
    *
    **/
    this.wrap = function (fn,thisobj) {
      var lru = this.lru;
      var fname = fn.name || anonFnId++;

      return function() {
        var self = thisobj || this;
        var args = Array.prototype.slice.apply(arguments);
        var callback = args.pop();
        var key;

        if (typeof callback !== 'function') {
          throw new Error('last argument to ' + fname + ' should be a function');
        }

        key = keygen(fname,args);

        var cachedValue = lru.get(key);
        if (cachedValue !== undefined) { // Means key was found
          const finalValue = cachedValue === UNDEFINED_VALUE_SIGIL ? undefined : cachedValue;
          // For consistent async behavior, you might use process.nextTick here
          // process.nextTick(() => callback.call(self, null, finalValue));
          return callback.call(self, null, finalValue);
        } else {
          // Cache miss
          args.push(function(err,res) {
            if (!err) {
              lru.set(key, res === undefined ? UNDEFINED_VALUE_SIGIL : res);
            }
            callback.call(self,err,res);
          });

          fn.apply(self,args);
        }
      };
    };

    // re-export keys and values
    // Note: lru-cache v11.x still has keys() and values() but they return iterators.
    // Depending on how these are used downstream, this might require adjustment
    // if array-like behavior was expected. For now, binding them as is.
    if (typeof this.lru.keys === 'function') {
      this.keys = this.lru.keys.bind(this.lru);
    }
    if (typeof this.lru.values === 'function') {
      this.values = this.lru.values.bind(this.lru);
    }
  },

  debug: require('./debug')
};

module.exports = cache;
