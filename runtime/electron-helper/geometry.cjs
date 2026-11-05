// Geometry is always in Electron screen DIPs, including negative monitor origins.
// Never round-trip native getBounds() sizes into a move: on Windows fractional
// DPI, the enclosing integer rectangle can grow by a DIP on every such round-trip.
const clamp = (value, low, high) => Math.min(Math.max(value, low), high);

function clampBounds(bounds, area) {
  const width = clamp(Math.round(bounds.width), 1, area.width);
  const height = clamp(Math.round(bounds.height), 1, area.height);
  return {
    x: clamp(Math.round(bounds.x), area.x, area.x + area.width - width),
    y: clamp(Math.round(bounds.y), area.y, area.y + area.height - height),
    width, height,
  };
}

function resizeBounds(bounds, size, area) {
  const width = Math.min(size.w, area.width), height = Math.min(size.h, area.height);
  return clampBounds({
    x: bounds.x + (bounds.width - width) / 2,
    y: bounds.y + bounds.height - height,
    width, height,
  }, area);
}

function dragBounds(start, point, size, area) {
  const width = Math.min(size.w, area.width), height = Math.min(size.h, area.height);
  return clampBounds({
    x: start.bounds.x + point.x - start.point.x + (start.bounds.width - width) / 2,
    y: start.bounds.y + point.y - start.point.y + start.bounds.height - height,
    width, height,
  }, area);
}

module.exports = { clampBounds, resizeBounds, dragBounds };
