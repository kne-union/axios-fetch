class Cache {
  static KEY_NAME = 'AXIOS_FETCH_CACHE';

  static now() {
    return Date.now();
  }

  constructor(options) {
    const { ttl, maxLength, isLocal, localName, onError } = { ttl: 0, maxLength: 1000, isLocal: false, onError: () => {}, ...options };
    this.ttl = ttl;
    this.data = {};
    this.cacheNameMapping = {};
    this.maxLength = maxLength;
    this.isLocal = localName ? true : isLocal;
    this.localName = localName;
    this.onError = onError;
    this._dirty = false;
    this._load();
  }

  _getStorage() {
    return typeof window !== 'undefined' ? window.localStorage : null;
  }

  _handleError(error) {
    if (typeof this.onError === 'function') {
      this.onError(error);
    }
  }

  _addCacheNameMapping(key, cacheName) {
    if (!cacheName) return;
    if (!this.cacheNameMapping[cacheName]) {
      this.cacheNameMapping[cacheName] = new Set();
    }
    this.cacheNameMapping[cacheName].add(key);
  }

  _removeCacheNameMapping(key, cacheName) {
    if (!cacheName || !this.cacheNameMapping[cacheName]) return;
    this.cacheNameMapping[cacheName].delete(key);
    if (this.cacheNameMapping[cacheName].size === 0) {
      delete this.cacheNameMapping[cacheName];
    }
  }

  _rebuildCacheNameMapping() {
    this.cacheNameMapping = {};
    Object.keys(this.data).forEach(key => {
      this._addCacheNameMapping(key, this.data[key].cacheName);
    });
  }

  _load() {
    if (!this.isLocal) {
      return;
    }
    try {
      const dataString = this._getStorage()?.getItem(this.localName || Cache.KEY_NAME);
      if (!dataString) {
        return;
      }

      const dataObj = JSON.parse(dataString);
      if (!dataObj || typeof dataObj !== 'object') {
        return;
      }
      for (const key of Object.keys(dataObj)) {
        dataObj[key].isLocal = true;
      }
      this.data = dataObj;
      this._rebuildCacheNameMapping();
    } catch (e) {
      this._handleError(e);
    }
  }

  _save() {
    if (!this.isLocal || !this._dirty) {
      return;
    }
    const storage = this._getStorage();
    if (!storage) {
      return;
    }
    this._dirty = false;
    const keys = Object.keys(this.data);
    Promise.allSettled(keys.map(key => this.data[key].value))
      .then(results => {
        const output = {};
        keys.forEach((key, index) => {
          const { isLocal, ...props } = this.data[key];
          if (isLocal === true && results[index].status === 'fulfilled') {
            output[key] = { ...props, value: results[index].value };
          }
        });
        storage.setItem(this.localName || Cache.KEY_NAME, JSON.stringify(output));
      })
      .catch(error => {
        this._handleError(error);
      });
  }

  _markDirty() {
    this._dirty = true;
  }

  get(key) {
    const obj = this.data[key];
    if (!obj) {
      return null;
    }
    if (obj.expires && Cache.now() >= obj.expires) {
      this._del(key);
      this._save();
      return null;
    }
    return obj.value;
  }

  delByCacheName(cacheName) {
    if (this.cacheNameMapping[cacheName]) {
      Array.from(this.cacheNameMapping[cacheName]).forEach(key => {
        this._del(key);
      });
      delete this.cacheNameMapping[cacheName];
      this._save();
    }
  }

  _del(key) {
    const obj = this.data[key];
    delete this.data[key];
    this._removeCacheNameMapping(key, obj?.cacheName);
    this._markDirty();
    if (obj && obj.expires && Cache.now() >= obj.expires) {
      return null;
    }
    return obj ? obj.value : null;
  }

  del(key) {
    const oldValue = this._del(key);
    this._save();
    return oldValue;
  }

  put(key, val, options) {
    let { ttl, isLocal, cacheName } = options || {};
    if (ttl === undefined) {
      ttl = this.ttl;
    }
    if (isLocal === undefined) {
      isLocal = this.isLocal;
    }
    const oldValue = this._del(key);
    if (val !== null) {
      const keys = Object.keys(this.data);
      if (keys.length >= this.maxLength) {
        let oldestKey = keys[0];
        let oldestTime = this.data[keys[0]].createTime;
        for (let i = 1; i < keys.length; i++) {
          if (this.data[keys[i]].createTime < oldestTime) {
            oldestTime = this.data[keys[i]].createTime;
            oldestKey = keys[i];
          }
        }
        this._del(oldestKey);
      }
      const now = Cache.now();
      this.data[key] = { expires: ttl === 0 ? null : now + ttl, value: val, createTime: now, isLocal, cacheName };
      this._addCacheNameMapping(key, cacheName);
    }
    this._save();
    return oldValue;
  }

  clean() {
    this.data = {};
    this.cacheNameMapping = {};
    this._markDirty();
    this._save();
  }
}

export default Cache;
