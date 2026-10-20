import { timingSafeEqual } from 'node:crypto'

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024
export const MAX_BODY_BYTES = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 1024
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]'])

export function httpError(status, message) {
  return Object.assign(new Error(message), { status })
}

export function validBaseUrl(value) {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol) || !LOOPBACK.has(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Desktop base URL must be a loopback HTTP(S) origin')
  }
  return url.origin
}

const HELPER_ENV = new Set([
  'PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'APPDATA', 'LOCALAPPDATA',
  'USERPROFILE', 'HOME', 'HOMEDRIVE', 'HOMEPATH', 'COMSPEC', 'PATHEXT',
  'PROGRAMDATA', 'PROGRAMFILES', 'COMMONPROGRAMFILES', 'PUBLIC', 'USERNAME', 'USERDOMAIN',
  'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'SESSIONNAME',
  'DISPLAY', 'WAYLAND_DISPLAY', 'XAUTHORITY', 'XDG_RUNTIME_DIR', 'DBUS_SESSION_BUS_ADDRESS',
  'LANG', 'LC_ALL', 'TZ',
])

export function helperEnv(source, baseUrl, token) {
  // Windows keeps the original name casing (Path, SystemRoot, ProgramFiles).
  const env = Object.fromEntries(Object.entries(source).filter(([key]) => HELPER_ENV.has(key.toUpperCase())))
  return { ...env, DSH_CAPYREP_BASE_URL: baseUrl, DSH_CAPYREP_TOKEN: token }
}

// Plugin routes bypass the host's SPA auth gate. Admit only same-origin browser
// subrequests on loopback, or this activation's private main-process capability.
// This is a browser/CSRF boundary, not protection from other local OS processes.
export function authorize(req, port, token) {
  let target
  try { target = new URL('http://' + req.headers.host) } catch { return null }
  if (!LOOPBACK.has(target.hostname) || Number(target.port || 80) !== port || target.username || target.password || target.pathname !== '/') return null
  const address = req.socket?.remoteAddress
  if (address && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) return null
  const supplied = req.headers.authorization
  const expected = 'Bearer ' + token
  if (typeof supplied === 'string' && Buffer.byteLength(supplied) === Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return 'helper'
  const site = String(req.headers['sec-fetch-site'] || '').toLowerCase()
  if (site === 'cross-site' || site === 'none' || site === 'same-site') return null
  const source = req.headers.origin || req.headers.referer
  if (source) {
    try { return new URL(source).origin === target.origin ? 'browser' : null } catch { return null }
  }
  // Chromium sends this even when a strict referrer policy strips Origin/Referer.
  // The site header is browser-set, so a cross-site page cannot forge it, and
  // the loopback Host/port/peer checks above still apply.
  return site === 'same-origin' ? 'browser' : null
}

export function readJson(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return Promise.reject(httpError(415, 'Expected application/json'))
  const length = req.headers['content-length']
  if (length != null && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) return Promise.reject(httpError(413, 'Request body too large'))
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    const cleanup = () => {
      clearTimeout(timer)
      req.off('data', data); req.off('end', end); req.off('aborted', aborted); req.off('error', error)
    }
    const fail = err => { cleanup(); req.resume(); reject(err) }
    const data = chunk => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) return fail(httpError(413, 'Request body too large'))
      chunks.push(chunk)
    }
    const end = () => {
      cleanup()
      try {
        const value = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error()
        resolve(value)
      } catch { reject(httpError(400, 'Expected a JSON object')) }
    }
    const aborted = () => fail(httpError(400, 'Request aborted'))
    const error = () => fail(httpError(400, 'Request failed'))
    const timer = setTimeout(() => fail(httpError(408, 'Request body timed out')), 5000)
    timer.unref?.()
    req.on('data', data); req.once('end', end); req.once('aborted', aborted); req.once('error', error)
  })
}

export function validatePng(base64) {
  if (typeof base64 !== 'string' || base64.length > MAX_BODY_BYTES || base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw httpError(400, 'Expected a base64 PNG')
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.length > MAX_IMAGE_BYTES) throw httpError(413, 'PNG must be at most 4 MiB')
  if (bytes.length < 45 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii', 12, 16) !== 'IHDR' || bytes.subarray(-12).toString('hex') !== '0000000049454e44ae426082') throw httpError(400, 'Expected a PNG with IHDR and IEND chunks')
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20)
  if (!width || !height || width > 4096 || height > 4096 || width * height > 16_777_216) throw httpError(400, 'PNG dimensions must be 1–4096 pixels per side')
  let offset = 8, imageData = false
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) throw httpError(400, 'Truncated PNG chunk')
    const length = bytes.readUInt32BE(offset)
    const type = bytes.toString('ascii', offset + 4, offset + 8)
    if (!/^[a-zA-Z]{4}$/.test(type) || offset + 12 + length > bytes.length || (type === 'IHDR' && offset !== 8) || (type === 'IEND' && (length !== 0 || offset + 12 !== bytes.length))) throw httpError(400, 'Malformed PNG chunks')
    if (type === 'IDAT' && length > 0) imageData = true
    offset += 12 + length
  }
  if (!imageData) throw httpError(400, 'PNG has no image data')
  return bytes
}
