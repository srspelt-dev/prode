// Bandera emoji a partir del nombre del equipo (en inglés o español).
// Se usa como fallback cuando el partido no tiene escudo (ej: amistosos a mano).

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z ]/g, "")
    .trim();
}

// Nombre normalizado (EN/ES) → código ISO de 2 letras
const NAME_TO_ISO: Record<string, string> = {
  // CONMEBOL
  argentina: "ar",
  brasil: "br",
  brazil: "br",
  uruguay: "uy",
  paraguay: "py",
  chile: "cl",
  colombia: "co",
  peru: "pe",
  ecuador: "ec",
  bolivia: "bo",
  venezuela: "ve",
  // CONCACAF
  mexico: "mx",
  "estados unidos": "us",
  "united states": "us",
  usa: "us",
  canada: "ca",
  "costa rica": "cr",
  panama: "pa",
  honduras: "hn",
  jamaica: "jm",
  "el salvador": "sv",
  guatemala: "gt",
  // UEFA
  espana: "es",
  spain: "es",
  francia: "fr",
  france: "fr",
  inglaterra: "gb",
  england: "gb",
  alemania: "de",
  germany: "de",
  italia: "it",
  italy: "it",
  portugal: "pt",
  "paises bajos": "nl",
  holanda: "nl",
  netherlands: "nl",
  belgica: "be",
  belgium: "be",
  croacia: "hr",
  croatia: "hr",
  suiza: "ch",
  switzerland: "ch",
  dinamarca: "dk",
  denmark: "dk",
  polonia: "pl",
  poland: "pl",
  "republica checa": "cz",
  chequia: "cz",
  czechia: "cz",
  "czech republic": "cz",
  serbia: "rs",
  austria: "at",
  ucrania: "ua",
  ukraine: "ua",
  escocia: "gb",
  scotland: "gb",
  gales: "gb",
  wales: "gb",
  noruega: "no",
  norway: "no",
  suecia: "se",
  sweden: "se",
  turquia: "tr",
  turkey: "tr",
  grecia: "gr",
  greece: "gr",
  rumania: "ro",
  romania: "ro",
  hungria: "hu",
  hungary: "hu",
  islandia: "is",
  iceland: "is",
  irlanda: "ie",
  ireland: "ie",
  "bosnia herzegovina": "ba",
  bosniaherzegovina: "ba",
  "bosnia and herzegovina": "ba",
  eslovaquia: "sk",
  slovakia: "sk",
  eslovenia: "si",
  slovenia: "si",
  // AFC
  japon: "jp",
  japan: "jp",
  "corea del sur": "kr",
  "south korea": "kr",
  "korea republic": "kr",
  "arabia saudita": "sa",
  "saudi arabia": "sa",
  iran: "ir",
  irak: "iq",
  iraq: "iq",
  qatar: "qa",
  australia: "au",
  "emiratos arabes unidos": "ae",
  uae: "ae",
  china: "cn",
  // CAF
  senegal: "sn",
  marruecos: "ma",
  morocco: "ma",
  nigeria: "ng",
  egipto: "eg",
  egypt: "eg",
  camerun: "cm",
  cameroon: "cm",
  ghana: "gh",
  argelia: "dz",
  algeria: "dz",
  tunez: "tn",
  tunisia: "tn",
  "costa de marfil": "ci",
  "ivory coast": "ci",
  "sudafrica": "za",
  "south africa": "za",
  mali: "ml",
  // OFC
  "nueva zelanda": "nz",
  "new zealand": "nz",
};

function iso2ToFlag(cc: string): string {
  return cc
    .toUpperCase()
    .replace(/./g, (c) =>
      String.fromCodePoint(127397 + c.charCodeAt(0))
    );
}

// Devuelve la bandera emoji o null si no se conoce el país.
export function countryFlag(name: string | null | undefined): string | null {
  if (!name) return null;
  const iso = NAME_TO_ISO[normalize(name)];
  return iso ? iso2ToFlag(iso) : null;
}

// Iniciales para el fallback final (cuando no hay escudo ni bandera).
export function teamInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}
