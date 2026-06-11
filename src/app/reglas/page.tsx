"use client";

import ScoreBadge from "@/components/ScoreBadge";

interface Ejemplo {
  real: string;
  pred: string;
  pts: number;
  detalle: string;
}

const EJEMPLOS: Ejemplo[] = [
  { real: "2-1", pred: "2-1", pts: 6, detalle: "Resultado exacto" },
  { real: "2-1", pred: "3-1", pts: 3, detalle: "Acertaste el ganador, pero no el marcador ni la diferencia" },
  { real: "2-0", pred: "3-1", pts: 4, detalle: "Ganador correcto + misma diferencia (2 goles)" },
  { real: "1-1", pred: "1-1", pts: 6, detalle: "Empate exacto" },
  { real: "1-1", pred: "0-0", pts: 3, detalle: "Acertaste el empate (cualquier empate suma 3)" },
  { real: "2-1", pred: "1-2", pts: 0, detalle: "Erraste el ganador" },
  { real: "0-0", pred: "1-0", pts: 0, detalle: "No era empate" },
];

export default function ReglasPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Cómo se suman los puntos</h1>

      {/* Tabla de reglas */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-2">Situación</th>
              <th className="px-4 py-2 text-right">Puntos</th>
            </tr>
          </thead>
          <tbody>
            <Regla
              texto="Resultado exacto (acertás el marcador completo)"
              pts={6}
            />
            <Regla
              texto="Ganador correcto + diferencia de goles exacta"
              pts={4}
            />
            <Regla
              texto="Ganador o empate correcto (sin acertar el marcador)"
              pts={3}
            />
            <Regla texto="No acertaste el resultado" pts={0} />
          </tbody>
        </table>
      </div>

      {/* Ejemplos */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Ejemplos
        </h2>
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {EJEMPLOS.map((e, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="text-sm">
                <div className="font-medium">
                  Resultado <span className="font-mono">{e.real}</span> · Tu
                  pronóstico <span className="font-mono">{e.pred}</span>
                </div>
                <div className="text-xs text-slate-400">{e.detalle}</div>
              </div>
              <ScoreBadge points={e.pts} />
            </div>
          ))}
        </div>
      </section>

      {/* Notas */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          A tener en cuenta
        </h2>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li className="card p-3">
            <strong>Plazo:</strong> podés cargar o editar tu pronóstico hasta{" "}
            <strong>5 minutos antes</strong> del inicio del partido. Después se
            bloquea.
          </li>
          <li className="card p-3">
            <strong>Penales:</strong> si un partido se define por penales, cuenta
            el resultado <strong>antes de la tanda</strong> (el del tiempo
            reglamentario o alargue). Ejemplo: si terminó 1-1 y se definió por
            penales, para el prode vale 1-1.
          </li>
          <li className="card p-3">
            <strong>Ligas:</strong> tus puntos cuentan tanto en la tabla global
            como en cada liga privada en la que estés.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Regla({ texto, pts }: { texto: string; pts: number }) {
  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-3">{texto}</td>
      <td className="px-4 py-3 text-right">
        <ScoreBadge points={pts} />
      </td>
    </tr>
  );
}
