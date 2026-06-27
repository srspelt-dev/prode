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
