const bgPage = chrome.extension.getBackgroundPage();
const prefixes = chrome.extension.getBackgroundPage().prefixes;

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const currentTab = tabs[0];
  const url = currentTab.url;
  
  document.querySelector("#domain").innerText = prefixes.getDomainName(url);
  document.querySelector("#prefix").value = prefixes.getPrefix(url);

  if (bgPage.getStatus() === 'off') {
    document.querySelector("#turnoffon").value = 'Start plugin';
  }

  document.querySelector("form").addEventListener("submit", (e) => {
    const prefix = document.querySelector("#prefix").value;
    if (prefix) {
      prefixes.setPrefix(url, prefix);
    }
    e.preventDefault();
  });

  document.querySelector('#remove').addEventListener('click', (e) => {
    prefixes.removePrefix(prefix);
    e.preventDefault();
  });

  document.querySelector('#turnoffon').addEventListener('click', (e) => {
    const status = document.querySelector("#turnoffon").value;
    if (status === 'Stop plugin') {
      bgPage.stop().then(() => {
        document.querySelector("#turnoffon").value = 'Start plugin';
      });
    } else {
      bgPage.start().then(() => {
        document.querySelector("#turnoffon").value = 'Stop plugin';
      });
    }
    e.preventDefault();
  });

});
