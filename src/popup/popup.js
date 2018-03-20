
const prefixes = chrome.extension.getBackgroundPage().prefixes;

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const currentTab = tabs[0];
  const url = currentTab.url;
  
  document.querySelector("#domain").innerText = prefixes.getDomainName(url);
  document.querySelector("#prefix").value = prefixes.getPrefix(url);

  document.querySelector("form").addEventListener("submit", (e) => {
    const prefix = document.querySelector("#prefix").value;
    if (prefix) {
      prefixes.setPrefix(url, prefix);
    }
    e.preventDefault();
  });

});
