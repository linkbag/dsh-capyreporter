// Kept dependency-free so the privileged boundary can be tested without Electron.
const { pathToFileURL } = require('node:url');
const METHODS = Object.freeze({
  '/state': 'GET', '/activity': 'GET', '/image': 'GET',
  '/desktop/heartbeat': 'POST', '/desktop/hide': 'POST', '/dismiss': 'POST', '/scale': 'POST',
});
function origin(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Expected a loopback HTTP(S) origin');
  return url.origin;
}
function trustedSender(event, win, filename) {
  return !!win && !win.isDestroyed() && event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame && event.senderFrame?.url === pathToFileURL(filename).href;
}
function requestSpec(path, body) {
  const method = typeof path === 'string' && Object.hasOwn(METHODS, path) ? METHODS[path] : null;
  if (!method || (method === 'GET' && body !== undefined)) throw new Error('Unsupported reporter operation');
  if (method === 'POST' && (!body || typeof body !== 'object' || Array.isArray(body) || JSON.stringify(body).length > 1024)) throw new Error('Expected a small operation object');
  return method;
}
module.exports = { origin, trustedSender, requestSpec };
