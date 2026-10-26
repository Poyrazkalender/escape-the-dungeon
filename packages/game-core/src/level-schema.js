export const DEFAULT_LEVEL = {
  platforms: [],
  blueSpawn: { x: 100, y: 400 },
  pinkSpawn: { x: 160, y: 400 },
  backgroundImage: null,
};

export function normalizeLevel(level) {
  if (!level || typeof level !== 'object') return JSON.parse(JSON.stringify(DEFAULT_LEVEL));
  return {
    platforms: Array.isArray(level.platforms) ? level.platforms : [],
    blueSpawn: level.blueSpawn && typeof level.blueSpawn === 'object' ? level.blueSpawn : { ...DEFAULT_LEVEL.blueSpawn },
    pinkSpawn: level.pinkSpawn && typeof level.pinkSpawn === 'object' ? level.pinkSpawn : { ...DEFAULT_LEVEL.pinkSpawn },
    backgroundImage: level.backgroundImage || null,
  };
}

export function validateLevel(level) {
  const errors = [];
  if (!level) return ['Level verisi yok'];
  if (!Array.isArray(level.platforms)) errors.push('platforms bir dizi olmalı');
  if (!level.blueSpawn?.x) errors.push('blueSpawn.x eksik');
  if (!level.pinkSpawn?.x) errors.push('pinkSpawn.x eksik');
  const goals = level.platforms?.filter(p => p.isGoal) || [];
  if (goals.length === 0) errors.push('En az 1 goal olmalı');
  if (goals.length > 1) errors.push('Sadece 1 goal olabilir');
  return errors;
}