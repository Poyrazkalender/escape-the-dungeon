/**
 * Eğik yüzey yardımcıları.
 *
 * Koordinat sistemi: y aşağı. angle > 0 → tahtanın SAĞ ucu aşağı iner.
 * Denge platformunun destek noktası her zaman tahtanın ortasıdır
 * (pivot = x + w/2, y + h/2), böylece plat.x / plat.y kutusu seçim,
 * çizim ve ağ senkronizasyonu için anlamlı kalır.
 */

export const DEFAULT_SEESAW = {
  angle: 0,
  maxAngle: 0.35, // ~20 derece
  mass: 6,
  damping: 3,     // 1/s cinsinden açısal sönümleme
  stiffness: 0,   // > 0 ise tahta dengeye geri döner (yay)
};

export function getSeesawGeometry(plat) {
  const angle = plat.angle || 0;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    angle,
    pivotX: plat.x + plat.w / 2,
    pivotY: plat.y + plat.h / 2,
    halfW: plat.w / 2,
    halfH: plat.h / 2,
    cos,
    sin,
    // dönen dikdörtgenin x eksenindeki izdüşümü (binici alanı için)
    extentX: Math.abs(plat.w / 2 * cos) + Math.abs(plat.h / 2 * sin),
  };
}

/** Tahtanın üst yüzeyinin dünya koordinatındaki Y değeri. */
export function seesawSurfaceY(plat, worldX) {
  const { angle, pivotX, pivotY, halfH, cos } = getSeesawGeometry(plat);
  const safeCos = Math.max(0.35, Math.abs(cos));
  return pivotY + (worldX - pivotX) * Math.tan(angle) - halfH / safeCos;
}

/** Verilen dünya X'i tahtanın üzerinde mi? */
export function isOverSeesaw(plat, worldX) {
  const { pivotX, extentX } = getSeesawGeometry(plat);
  return Math.abs(worldX - pivotX) <= extentX;
}

/**
 * Tek serbestlik dereceli denge platformu.
 * riders: [{ x, weight }]  (x = oyuncunun dünya merkez X'i)
 * Dönen değer: yeni açı.
 */
export function stepSeesaw(plat, riders, dt, gravity) {
  const { angle, pivotX } = getSeesawGeometry(plat);
  const mass = plat.mass ?? DEFAULT_SEESAW.mass;
  // ince çubuk ataleti: I = m * w^2 / 12
  const inertia = Math.max(1, mass * plat.w * plat.w / 12);

  let torque = 0;
  for (const rider of riders) {
    // yatay kol: m * g * (x - pivot). Sağdaki binici açıyı pozitif yönde büyütür.
    torque += (rider.weight ?? 1) * gravity * (rider.x - pivotX);
  }
  if (plat.stiffness) torque -= plat.stiffness * plat.w * plat.w * angle;

  plat.angularVelocity = (plat.angularVelocity || 0) + (torque / inertia) * dt;
  const damping = plat.damping ?? DEFAULT_SEESAW.damping;
  plat.angularVelocity *= Math.exp(-damping * dt);

  let next = angle + plat.angularVelocity * dt;
  const maxAngle = plat.maxAngle ?? DEFAULT_SEESAW.maxAngle;
  if (next > maxAngle) {
    next = maxAngle;
    plat.angularVelocity = 0;
  } else if (next < -maxAngle) {
    next = -maxAngle;
    plat.angularVelocity = 0;
  }
  plat.angle = next;
  return next;
}
