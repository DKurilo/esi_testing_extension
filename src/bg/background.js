const _appendBuffer = (buffer1, buffer2) => {
  var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
};

const requestsInfo = {};

let status = 'on';

const storage = browser.storage.local;
storage.get('!STATUS!').then(data => {
  if (data['!STATUS!'] === 'off') {
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
    '!STATUS!': 'off'
  });
};

this.start = () => {
  status = 'on';
  browser.browserAction.setIcon({
    path: "icons/icon48.png"
  });
  return storage.set({
    '!STATUS!': 'on'
  });
};

this.getStatus = () => status;

this.getInfo = tabid => getPopupFromInfo(getRequestInfo(tabid));

const getScriptFromInfo = info => {
  if (info.fragments.length <= 0) {
    return undefined;
  }
  const scriptArr = info.fragments.map(e => {
    const headers = e.headers.replace(/\\/ig, '\\\\').replace(/"/ig, '\\\"').split(/[\r\n]+/).join('\\n');
    const script = 'console.log(\"ESI fragment:\\n ' + 
                   e.fragment.replace(/\\/ig, '\\\\').replace(/"/ig, '\\\"') + 
                   '\\nStatus: %c' + e.status + 
                   '%c\\nHeaders:\\n' + headers + '\", \"' + (e.status === 200 ? '' : 'color:red;') + '\", \"\");';
    return script;
  });
  return scriptArr.join('\n');
};

const encodeHtml = html => html.replace(/&/ig, '&amp;').replace(/>/ig, '&gt;').replace(/</ig, '&lt;');
const wrapLink = h => h.replace(/(http.*)/, '<a href="$1">$1</a>');

const getPopupFromInfo = info => {
  if (info.fragments.length <= 0) {
    return undefined;
  }
  const htmlArr = info.fragments.map(e => {
    const headers = e.headers.split(/[\r\n]+/).map(h => wrapLink(h)).join('<br/>');
    const html = 'ESI fragment:<br/> ' + 
                 encodeHtml(e.fragment).replace(/src="([^"]*)/,'src="<a href="' + e.src + '">$1</a>') +
                 '<br/>Status: ' + 
                 (e.status === 200 ? e.status : `<span class="err">${e.status}</span>`) + 
                 '<br/>Headers:<br/>' + headers;
    return html;
  });
  return '<p>' + htmlArr.join('</p><p>') + '</p>';
}

const getRequestInfo = (tabid) => {
  if (!requestsInfo[tabid]) {
    requestsInfo[tabid] = {
      contentType: '',
      fragments: [],
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

    if (requestsInfo[details.tabId]) {
      delete requestsInfo[details.tabId];
    }

    browser.browserAction.setIcon({
      path: "icons/icon48.png",
      tabId: details.tabId,
    });
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
        filter.write(docStream);
        filter.disconnect();
        return;
      }
      let doc = decoder.decode(docStream, {stream: true});
      const re = /<esi:[^>]*>/ig;
      const found = doc.match(re);
      if (found !== null && found.length > 0) {
        browser.browserAction.setIcon({
          path: "icons/icon48-esi.png",
          tabId: details.tabId
        });
        found.forEach(e => {
          const lcE = e.toLowerCase();
          if (lcE.indexOf('<esi:include') === 0) {
            let src = e.replace(/.*src="([^"]*)".*/i, "$1");
            if (src.indexOf('://') <= 0) {
              src = domainPart + src;
            }
            const xhr = new XMLHttpRequest();
            xhr.open("GET", src, false);
            xhr.send(null);

            getRequestInfo(details.tabId).fragments.push({
              fragment: e,
              src: src,
              status: xhr.status,
              headers: xhr.getAllResponseHeaders(),
            });

            const docarr = doc.split(e);
            if (xhr.status === 200) {
              doc = docarr.join(xhr.responseText);
            } else {
              doc = docarr.join('');
              browser.browserAction.setIcon({
                path: "icons/icon48-err.png",
                tabId: details.tabId
              });
            }
          } else if (lcE.indexOf('<esi:remove') === 0) {
            const docarr = doc.split(e);
            doc = docarr.join('');
          } else if (lcE.indexOf('<esi:comment') === 0) {
            const docarr = doc.split(e);
            doc = docarr.join('');
          }
        });
      }
      const docarr = doc.split('<!--esi');
      if (docarr.length > 1) {
        for (let i = 0; i < docarr.length; i++) {
          docarr[i] = docarr[i].replace(/-->/, '');
        }
        doc = docarr.join('');
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
    details.requestHeaders.push({name:"Surrogate-Capability",value: ((prefix ? prefix : '') + 'ESI/1.0')});
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
    const script = getScriptFromInfo(getRequestInfo(details.tabId));
    if (script) {
      browser.tabs.executeScript(tabInfo.id, {
        code: script,
        runAt: "document_start"
      }).then(() => {
      });      
    }
  });
});

browser.tabs.onRemoved.addListener(details => {
  if (requestsInfo[details.tabId]) {
    delete requestsInfo[details.tabId];
  }
});

