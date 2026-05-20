class Cache {
  static KEY_NAME = 'AXIOS_FETCH_CACHE';

  static now() {
    return Date.now();
  }

  constructor(options) {
    const { ttl, maxLength, isLocal, localName } = { ttl: 0, maxLength: 1000, isLocal: false, ...options };
    this.ttl = ttl;
    this.data = {};
    this.cacheNameMapping = {};
    this.maxLength = maxLength;
    this.isLocal = localName ? true : isLocal;
    this.localName = localName;
    this._dirty = false;
    this._load();
  }

  _load() {
    if (!this.isLocal) {
      return;
    }
    try {
      const dataString = window.localStorage?.getItem(this.localName || Cache.KEY_NAME);
      if (!dataString) {
        return;
      }

      const dataObj = JSON.parse(dataString);
      for (const key of Object.keys(dataObj)) {
        dataObj[key].isLocal = true;
      }
      this.data = dataObj;
    } catch (e) {}
  }

  _save() {
    if (!this.isLocal || !this._dirty) {
      return;
    }
    this._dirty = false;
    const keys = Object.keys(this.data);
    Promise.allSettled(keys.map(key => this.data[key].value)).then(results => {
      const output = {};
      keys.forEach((key, index) => {
        const { isLocal, ...props } = this.data[key];
        if (isLocal === true && results[index].status === 'fulfilled') {
          output[key] = { ...props, value: results[index].value };
        }
      });
      window.localStorage?.setItem(this.localName || Cache.KEY_NAME, JSON.stringify(output));
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
      delete this.data[key];
      this._markDirty();
      this._save();
      return null;
    }
    return obj.value;
  }

  delByCacheName(cacheName) {
    if (this.cacheNameMapping[cacheName]) {
      this.cacheNameMapping[cacheName].forEach(key => {
        this._del(key);
      });
      this.cacheNameMapping[cacheName].clear();
      this._save();
    }
  }

  _del(key) {
    const obj = this.data[key];
    delete this.data[key];
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
        delete this.data[oldestKey];
      }
      const now = Cache.now();
      this.data[key] = { expires: ttl === 0 ? null : now + ttl, value: val, createTime: now, isLocal };
      if (cacheName) {
        if (!this.cacheNameMapping[cacheName]) {
          this.cacheNameMapping[cacheName] = new Set();
        }
        this.cacheNameMapping[cacheName].add(key);
      }
    }
    this._save();
    return oldValue;
  }

  clean() {
    this.data = {};
    this._markDirty();
    this._save();
  }
}

export default Cache;
