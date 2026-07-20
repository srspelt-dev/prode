// Lógica de comparación de pronósticos especiales (sin dependencias de DB,
// para poder usarla también en el cliente / pantalla de especiales).

export function norm(s: unknown): string {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

// Normaliza texto: sin acentos, minúsculas, sin espacios extra.
export function normText(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Match flexible para texto (goleador): tolera acentos, nombre de pila y
// variantes, comparando por apellido. Ej: "Mbappe" / "Kilian Mbappé" ✓.
export function textMatch(answer: unknown, correct: unknown): boolean {
  const a = normText(answer);
  const c = normText(correct);
  if (!a || !c) return false;
  if (a === c) return true;
  const surname = c.split(/\s+/).pop() || "";
  if (surname.length >= 3 && a.includes(surname)) return true;
  const aSurname = a.split(/\s+/).pop() || "";
  return aSurname.length >= 3 && c.includes(aSurname);
}

// ¿La respuesta de una pregunta especial es correcta? (misma lógica que el scoring)
export function isSpecialCorrect(
  key: string,
  type: "team" | "text",
  answers: Record<string, string> | undefined,
  results: Record<string, string> | undefined
): boolean {
  if (!answers || !results || !results[key]) return false;

  if (key === "finalista") {
    // El subcampeón cuenta si lo nombraste como finalista O como campeón.
    const sub = results.finalista;
    return norm(answers.finalista) === norm(sub) || norm(answers.campeon) === norm(sub);
  }
  if (type === "text") return textMatch(answers[key], results[key]);
  return norm(answers[key]) === norm(results[key]);
}
