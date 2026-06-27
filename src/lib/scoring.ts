// Lógica de puntuación del prode (portada de la spec en Python).
//
//  - Resultado exacto                     → 6 pts
//  - Ganador correcto + diferencia exacta → 4 pts
//  - Ganador / empate correcto            → 3 pts
//  - No acertó                            → 0 pts

export function calcularPuntos(
  realLocal: number,
  realVisitante: number,
  predLocal: number,
  predVisitante: number
): number {
  // Resultado exacto
  if (predLocal === realLocal && predVisitante === realVisitante) {
    return 6;
  }

  const realDiff = realLocal - realVisitante;
  const predDiff = predLocal - predVisitante;

  // Ambos empate (pero no exacto, ya cubierto arriba) → 3
  if (realDiff === 0 && predDiff === 0) {
    return 3;
  }

  // Uno empató y el otro no → no acertó el resultado
  if (realDiff === 0 || predDiff === 0) {
    return 0;
  }

  // Distinto ganador → 0
  if (realDiff > 0 !== predDiff > 0) {
    return 0;
  }

  // Ganador correcto + diferencia de goles exacta → 4
  if (realDiff === predDiff) {
    return 4;
  }

  // Ganador correcto → 3
  return 3;
}

// Puntos extra (eliminatorias) por acertar quién pasa de ronda.
export const ADVANCE_BONUS = 3;

// Equipo que avanzó en un partido de eliminatorias:
// el que ganó por penales, o el de mayor marcador (90'+alargue).
export function advancingTeam(
  realLocal: number,
  realVisitante: number,
  wentToPenalties: boolean,
  penaltyWinner?: "home" | "away" | null
): "home" | "away" | null {
  if (wentToPenalties) return penaltyWinner ?? null;
  if (realLocal > realVisitante) return "home";
  if (realVisitante > realLocal) return "away";
  return null;
}
