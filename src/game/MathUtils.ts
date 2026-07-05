export function raycastAABB(origin: {x: number, y: number}, dir: {x: number, y: number}, rect: {x: number, y: number, w: number, h: number}) {
  let tmin = (rect.x - origin.x) / dir.x;
  let tmax = (rect.x + rect.w - origin.x) / dir.x;
  if (tmin > tmax) { let temp = tmin; tmin = tmax; tmax = temp; }

  let tymin = (rect.y - origin.y) / dir.y;
  let tymax = (rect.y + rect.h - origin.y) / dir.y;
  if (tymin > tymax) { let temp = tymin; tymin = tymax; tymax = temp; }

  if ((tmin > tymax) || (tymin > tmax)) return null;

  if (tymin > tmin) tmin = tymin;
  if (tymax < tmax) tmax = tymax;

  if (tmin < 0) return null;
  return tmin;
}

export function raycastCircle(origin: {x: number, y: number}, dir: {x: number, y: number}, circle: {x: number, y: number, radius: number}) {
  let oc = { x: origin.x - circle.x, y: origin.y - circle.y };
  let a = dir.x * dir.x + dir.y * dir.y;
  let b = 2.0 * (oc.x * dir.x + oc.y * dir.y);
  let c = (oc.x * oc.x + oc.y * oc.y) - circle.radius * circle.radius;
  let discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  let t = (-b - Math.sqrt(discriminant)) / (2.0 * a);
  if (t < 0) return null;
  return t;
}
