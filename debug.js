"use strict";

/**
 * For debugging caches in an express APP
 *
 * first, register all your caches with this module
 *
 * debug.register(cache1);
 * debug.register(cache2)
 *
 * You can do so while creating, like this
 *
 * ```
 * var obcache = require('obcache');
 * var cache = obcache.debug.register(new obcache.Create({ max: 100, maxAge: 300}),'mycache');
 * ```
 *
 * Then expose debug.view on some route to see all keys in cache
 * app.get('/debug/caches',debug.view);
 *
 * Or install a signal handler and print debugging info on SIGUSR2
 *
 * process.on('SIGUSR2', debug.log);
 *
 **/

var hostname = require('os').hostname();

var caches = {};
var index = 0;

var debug = {
  register: function(cache,name) {
    var cname = name || ('anon_' + index++);
    caches[cname] = cache;
    return cache;
  },

  view: function(req,res,next) {
    var data = [];
    var cnames = Object.keys(caches);
    cnames.forEach(function(cname) {
      var cache = caches[cname];
      var cachestats = cache.stats;
      var total = cachestats.hit + cachestats.miss;
      var stats = { 
                    name: cname, 
                    size: cache.store.size(), 
                    keycount: cache.store.keycount(), 
                    hitrate: ((cachestats.hit*100)/(total || 1))|0,
                    resets : cachestats.reset,
                    pending: cachestats.pending 
                  };
      if (req.query) {
        if (req.query.detail == cname && cache.store.values) {
          stats.values = cache.store.values();
        } else if (req.method == 'POST' && req.query.flush == cname) {
          cache.store.reset();
          stats.resets++;
          cache.stats.reset++;
        }
      }
      data.push(stats);
    });
    res.json({ pid: process.pid, uptime: process.uptime(), host: hostname, data:data });
  },

  log: function(cb) {
    debug.view({ query: {} },{ json: cb || console.log }, function() { });
  }

};

module.exports = debug;
