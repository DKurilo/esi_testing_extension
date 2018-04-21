const prefixes = chrome.extension.getBackgroundPage().prefixes;

const load = () => {
  let counter = 0;
  const settings = document.querySelector("#settings");
  while(settings.firstChild){
    settings.removeChild(settings.firstChild);
  }
  let el = settings.appendChild(document.createElement('span'));
  el.innerText = 'Domain';
  el.classList='domain';
  el = settings.appendChild(document.createElement('span'));
  el.innerText = 'Prefix';
  el.classList='prefix';
  settings.appendChild(document.createElement('br'));
  //TODO: add Promise processing
  Object.entries(prefixes.getAllPrefixes()).forEach((el) => {
    const [domain, prefix] = el;
    el = settings.appendChild(document.createElement('label'));
    el.innerText = domain;
    el.classList='domain';
    el.setAttribute('for', 'i' + counter);
    el = settings.appendChild(document.createElement('input'));
    el.classList='prefix';
    el.setAttribute('id', 'i' + counter);
    el.setAttribute('type', 'text');
    el.setAttribute('value', prefix);
    el = settings.appendChild(document.createElement('span'));
    el.innerText = 'Remove';
    el.classList='remove';
    el.setAttribute('id', 'r' + counter);
    el.setAttribute('type', 'text');
    settings.appendChild(document.createElement('br'));
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
