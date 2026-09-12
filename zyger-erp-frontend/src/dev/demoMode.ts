const KEY = 'zyger-demo';
let enabled = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(KEY) === '1';

export function enableDemo() {
  enabled = true;
  sessionStorage.setItem(KEY, '1');
}

export function disableDemo() {
  enabled = false;
  sessionStorage.removeItem(KEY);
}

export function isDemo() {
  return enabled;
}