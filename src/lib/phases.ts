// Etiquetas y orden de las fases del torneo.

export const PHASE_LABEL: Record<string, string> = {
  amistoso: "Amistoso",
  grupos: "Fase de grupos",
  treintaidosavos: "16avos de final",
  octavos: "Octavos de final",
  cuartos: "Cuartos de final",
  semifinal: "Semifinales",
  tercer_puesto: "Tercer puesto",
  final: "Final",
};

export function phaseLabel(phase: string): string {
  return PHASE_LABEL[phase] ?? phase;
}

// Rondas de eliminatorias, en orden.
export const KNOCKOUT_PHASES = [
  "treintaidosavos",
  "octavos",
  "cuartos",
  "semifinal",
  "tercer_puesto",
  "final",
] as const;

// Orden de columnas para el bracket (3er puesto al final, aparte).
export const BRACKET_ORDER = [
  "treintaidosavos",
  "octavos",
  "cuartos",
  "semifinal",
  "final",
  "tercer_puesto",
] as const;

// Etiquetas cortas para las columnas del bracket.
export const PHASE_SHORT: Record<string, string> = {
  treintaidosavos: "16avos",
  octavos: "8vos",
  cuartos: "4tos",
  semifinal: "Semis",
  tercer_puesto: "3er puesto",
  final: "Final",
};
