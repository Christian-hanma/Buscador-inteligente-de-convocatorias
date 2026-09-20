const DEFAULT_WEIGHTS = {
  education: 20,
  experience: 25,
  skills: 25,
  location: 10,
  remuneration: 10,
  contract: 10,
};

export function getScoreWeights() {
  try {
    const raw = process.env.SCORE_WEIGHTS_JSON;
    if (!raw) return { ...DEFAULT_WEIGHTS };
    const parsed = JSON.parse(raw);
    const weights = { ...DEFAULT_WEIGHTS, ...parsed };
    const total = Object.values(weights).reduce((a, b) => a + Number(b || 0), 0);
    if (total > 0) return weights;
  } catch {
    /* usar por defecto */
  }
  return { ...DEFAULT_WEIGHTS };
}

/** Combina sub-scores (0-100) con pesos configurables. Resultado redondeado. */
export function computeFinalScore(subscores, weights = getScoreWeights()) {
  let acc = 0;
  let total = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const score = subscores[key];
    if (typeof score === 'number') {
      acc += Number(weight) * clampScore(score);
      total += Number(weight);
    }
  }
  if (total === 0) return 0;
  return Math.round(acc / total);
}

export function clampScore(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}