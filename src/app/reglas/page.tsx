"use client";

import { Calculator, AlertTriangle, Clock, Users } from "lucide-react";

export default function ReglasPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">Reglas</h1>

      {/* Cálculo de puntos */}
      <div className="card p-4">
        <SectionHeader
          icon={<Calculator size={18} />}
          tint="bg-amber-500/15 text-amber-500"
          title="Cálculo de puntos"
        />
        <div className="mt-4 space-y-4">
          <RuleRow
            pts={6}
            tint="bg-emerald-500/15 text-emerald-500"
            title="Resultado exacto"
            desc="Tu pronóstico fue 2-1 y el partido finalizó 2-1. Puntaje máximo."
          />
          <RuleRow
            pts={4}
            tint="bg-emerald-500/15 text-emerald-500"
            title="Ganador + diferencia de goles"
            desc="Tu pronóstico fue 2-1 y finalizó 1-0. Acertaste el ganador y la diferencia de goles."
          />
          <RuleRow
            pts={3}
            tint="bg-emerald-500/15 text-emerald-500"
            title="Ganador o empate"
            desc="2-1 y finalizó 2-0: acertaste el ganador. 1-1 y finalizó 2-2: acertaste el empate."
          />
          <RuleRow
            pts={0}
            tint="bg-red-500/15 text-red-500"
            title="Fallaste"
            desc="Tu pronóstico fue 2-1 y el partido finalizó 1-2. No sumás puntos."
          />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-slate-400">
          * En los empates no se cuenta la diferencia de goles. Si un partido
          finalizó 1-1 y tu pronóstico fue:
          <br />→ 1-1, sumás 6 puntos. → cualquier otro empate, sumás 3 puntos.
        </p>
      </div>

      {/* Penales */}
      <div className="card p-4">
        <SectionHeader
          icon={<AlertTriangle size={18} />}
          tint="bg-red-500/15 text-red-500"
          title="Penales"
        />
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-300">
          Si un partido se define por penales, se usa el resultado{" "}
          <strong>previo a la tanda</strong> (90' o alargue) para el cálculo.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-300">
          <strong>Bonus en eliminatorias:</strong> desde los 16avos, además del
          marcador elegís <strong>quién pasa de ronda</strong>. Si el partido se
          define <strong>por penales</strong> y acertaste al equipo que clasificó,
          sumás <strong>+3 puntos</strong> extra. (Si hubo ganador en los 90' o
          alargue, el marcador ya te premia acertar el ganador.)
        </p>
      </div>

      {/* Tiempo límite */}
      <div className="card p-4">
        <SectionHeader
          icon={<Clock size={18} />}
          tint="bg-sky-500/15 text-sky-500"
          title="Tiempo límite para pronosticar"
        />
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-300">
          Podés cargar o editar tu pronóstico hasta{" "}
          <strong>1 minuto antes</strong> del inicio del partido. Después se
          bloquea.
        </p>
      </div>

      {/* Ligas */}
      <div className="card p-4">
        <SectionHeader
          icon={<Users size={18} />}
          tint="bg-pitch/15 text-pitch dark:text-pitch-light"
          title="Ligas y puntos"
        />
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-300">
          El ranking global suma solo los puntos del Mundial. Tus puntos también
          cuentan en cada liga privada en la que estés.
        </p>
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  tint,
  title,
}: {
  icon: React.ReactNode;
  tint: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tint}`}
      >
        {icon}
      </span>
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
  );
}

function RuleRow({
  pts,
  tint,
  title,
  desc,
}: {
  pts: number;
  tint: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${tint}`}
      >
        +{pts}
      </span>
      <div className="min-w-0">
        <div className="font-semibold">{title}</div>
        <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {desc}
        </p>
      </div>
    </div>
  );
}
