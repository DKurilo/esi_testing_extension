const prefixes = chrome.extension.getBackgroundPage().prefixes;

const load = () => {
  let counter = 0;
  document.querySelector("#settings").innerHTML = 
    '<span class="domain">Domain</span> \
    <span class="prefix">Prefix</span><br/>';
  //TODO: add Promise processing
  Object.entries(prefixes.getAllPrefixes()).forEach((el) => {
    const [domain, prefix] = el;
    const escapedDomain = escape(domain);
    const escapedPrefix = escape(prefix).replace(/"/ig, '$quote;');
    document.querySelector("#settings").innerHTML += 
      `<label class="domain" for="i${counter}">${escapedDomain}</label> \
      <input class="prefix" id="i${counter}" type="text" value="${escapedPrefix}"/> \
      <span class="remove" id="r${counter}">Remove</span><br/>`;
    let id = 'i' + counter;
    document.querySelector('#' + id).addEventListener('change', () => {
      save(id, domain);
    });
    document.querySelector('#r' + counter).addEventListener('click', () => {
      remove(domain);
    });
    counter++;
  });
};

document.addEventListener('DOMContentLoaded', e => {
  load();
});

document.querySelector('#clear').addEventListener('click', () => {
  removeAll();
});

function removeAll() {
  prefixes.clearPrefixes().then(() => {
    load();
  });
}

function save(id, domain) {
  const value = document.querySelector("#" + id).value;
  prefixes.setPrefix(domain, value);
}

function remove(domain) {
  prefixes.removePrefix(domain).then(() => {
    load();
  });
}
