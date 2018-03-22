const _appendBuffer = (buffer1, buffer2) => {
  var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
};

const requestsInfo = {};

let status = 'on';

const storage = browser.storage.local;
storage.get('!status!').then(data => {
  if (data === 'off') {
    this.stop();
  }
});

this.prefixes = new Prefixes();

this.stop = () => {
  status = 'off';
  browser.browserAction.setIcon({
    path: "icons/icon48-off.png"
  });
  return storage.set({
    '!status!': 'off'
  });
};

this.start = () => {
  status = 'on';
  browser.browserAction.setIcon({
    path: "icons/icon48.png"
  });
  return storage.set({
    '!status!': 'on'
  });
};

this.getStatus = () => status;

const getRequestInfo = (tabid) => {
  if (!requestsInfo[tabid]) {
    requestsInfo[tabid] = {
      contentType: '',
      scriptsToLaunch: []
    }
  }
  return requestsInfo[tabid];
}

chrome.webRequest.onHeadersReceived.addListener(
  details => {
    if (status === 'off') {
      return;
    }
    for (let i = 0; i < details.responseHeaders.length; i++){
      if (details.responseHeaders[i].name.toLowerCase() === 'content-type') {
        getRequestInfo(details.tabId).contentType = details.responseHeaders[i].value.toLowerCase();
      }
    }
  },
  {urls: ["<all_urls>"], types: ["main_frame"]},
  ['responseHeaders']
)

chrome.webRequest.onBeforeRequest.addListener(
  details => {
    if (status === 'off') {
      return;
    }
    const filter = browser.webRequest.filterResponseData(details.requestId);
    const domainPart = details.url.replace(/([^\/]*\/\/[^\/]*).*/ig, '$1');
    const decoder = new TextDecoder("utf-8");
    const encoder = new TextEncoder();

    let docStream = new Uint8Array();

    filter.ondata = event => {
      docStream = _appendBuffer(docStream, event.data);
    }

    filter.onstop = event => {
      if (getRequestInfo(details.tabId).contentType.indexOf('text') < 0) {
        requestsInfo[details.tabId] = undefined;
        filter.write(docStream);
        filter.disconnect();
        return;
      }
      let doc = decoder.decode(docStream, {stream: true});
      const re = /<esi:include\s[^>]*>/ig;
      const found = doc.match(re);
      if (found !== null && found.length > 0) {
        found.forEach(e => {
          let src = e.replace(/.*src="([^"]*)".*/i, "$1");
          if (src.indexOf('://') <= 0) {
            src = domainPart + src;
          }
          const xhr = new XMLHttpRequest();
          xhr.open("GET", src, false);
          xhr.send(null);

          const headers = xhr.getAllResponseHeaders().replace(/\\/ig, '\\\\').replace(/"/ig, '\\\"').split(/[\r\n]+/).join('\\n');
          const script = 'console.log(\"ESI fragment:\\n ' + e.replace(/\\/ig, '\\\\').replace(/"/ig, '\\\"') + '\\nStatus: ' + xhr.status + '\\nHeaders:\\n' + headers + '\");';
          getRequestInfo(details.tabId).scriptsToLaunch.push(script);

          const docarr = doc.split(e);
          if (xhr.status === 200) {
            doc = docarr.join(xhr.responseText);
          } else {
            doc = docarr.join('');
          }
        });
      }
      const stream = encoder.encode(doc);
      filter.write(stream);
      filter.disconnect();
    }

    return {};
  },
  {urls: ["<all_urls>"], types: ["main_frame"]},
  []
);

chrome.webRequest.onBeforeSendHeaders.addListener(
  details => {
    if (status === 'off') {
      return;
    }
    const prefix = this.prefixes.getPrefix(details.url);
    details.requestHeaders.push({name:"Surrogate-Capability",value: ((prefix ? (prefix + '-') : '') + 'ESI/1.0')});
    return {requestHeaders: details.requestHeaders};
  },
  {urls: ["<all_urls>"]},
  ["blocking", "requestHeaders"]
);


chrome.webNavigation.onDOMContentLoaded.addListener(details => {
  if (status === 'off') {
    return;
  }
  if (details.frameId !== 0) {
    return;
  }
  if (getRequestInfo(details.tabId).contentType.indexOf('text') < 0) {
    delete requestsInfo[details.tabId];
    return;
  }
  browser.tabs.get(details.tabId).then(tabInfo => {
    browser.tabs.executeScript(tabInfo.id, {
      code: getRequestInfo(details.tabId).scriptsToLaunch.join('\n'),
      runAt: "document_start"
    }).then(() => {
      delete requestsInfo[details.tabId];
    });
  });
});
