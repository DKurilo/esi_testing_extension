function Prefixes() {
  this.storage = browser.storage.local;
  this.storage_cache = {};
  this.ready = false;

  this.loading = this.storage.get(null).then(data => {
    this.storage_cache = data;
    this.ready = true;
  });

  const domainNameFromUrl = url => {
    return url.replace(/[^\:]*\:\/\/([^\/]*).*/, '$1');
  };

  return {
    getPrefix: url => {
      const domain = domainNameFromUrl(url);
      if (this.ready && this.storage_cache[domain]) {
        return this.storage_cache[domain];
      } else {
        return '';
      }
    },
    setPrefix: (url, prefix) => {
      const domain = domainNameFromUrl(url);
      this.storage_cache[domain] = prefix;
      const obj = {};
      obj[domainNameFromUrl(url)] = prefix;
      return this.storage.set(obj);
    },
    getAllPrefixes: () => {
      if (this.ready) {
        return this.storage_cache;
      } else {
        return [];
      }
    },
    getDomainName: url => domainNameFromUrl(url),
    removePrefix: url => {
      const domain = domainNameFromUrl(url);
      delete this.storage_cache[domain];
      return this.storage.remove(domain);
    },
    clearPrefixes: () => {
      this.storage_cache = {};
      return this.storage.clear();
    },
  };
}
