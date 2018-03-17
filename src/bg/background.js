const _appendBuffer = (buffer1, buffer2) => {
  var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
};

const scriptsToLaunch = [];
let contentType = null;

chrome.webRequest.onHeadersReceived.addListener(
  details => {
    for (let i = 0; i < details.responseHeaders.length; i++){
      if (details.responseHeaders[i].name.toLowerCase() === 'content-type') {
        contentType = details.responseHeaders[i].value.toLowerCase();
      }
    }
  },
  {urls: ["<all_urls>"], types: ["main_frame"]},
  ['responseHeaders']
)

chrome.webRequest.onBeforeRequest.addListener(
  details => {
    const filter = browser.webRequest.filterResponseData(details.requestId);
    const domainPart = details.url.replace(/([^\/]*\/\/[^\/]*).*/ig, '$1');
    const decoder = new TextDecoder("utf-8");
    const encoder = new TextEncoder();

    let docStream = new Uint8Array();

    filter.ondata = event => {
      docStream = _appendBuffer(docStream, event.data);
    }

    filter.onstop = event => {
      if (contentType && contentType.indexOf('text') < 0) {
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
          if (xhr.status === 200) {
            const headers = xhr.getAllResponseHeaders().replace(/\\/ig, '\\\\').replace(/"/ig, '\\\"').split(/[\r\n]+/).join('\\n');
            const script = 'console.log(\"ESI fragment:\\n ' + e.replace(/\\/ig, '\\\\').replace(/"/ig, '\\\"') + '\\nHeaders:\\n' + headers + '\");';
            scriptsToLaunch.push(script);
            const docarr = doc.split(e);
            doc = docarr.join(xhr.responseText);
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
    details.requestHeaders.push({name:"Surrogate-Capability",value:'abc-ESI/1.0'});
    return {requestHeaders: details.requestHeaders};
  },
  {urls: ["<all_urls>"]},
  ["blocking", "requestHeaders"]
);


chrome.webNavigation.onDOMContentLoaded.addListener(details => {
  if (details.frameId !== 0 || (contentType && contentType.indexOf('text') < 0)) {
    return;
  }
  browser.tabs.query({active: true, windowId: browser.windows.WINDOW_ID_CURRENT}).then(tabInfo => {
    browser.tabs.executeScript(tabInfo.id, {
      code: scriptsToLaunch.join('\n'),
      runAt: "document_start"
    });
  });
});
