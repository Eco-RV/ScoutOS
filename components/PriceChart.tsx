"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPrice } from "@/lib/format";

interface Point {
  date: string;
  price: number;
}

const day = (iso: string) => new Date(iso).toLocaleDateString("es-CR", { day: "numeric", month: "short" });

export default function PriceChart({ points }: { points: Point[] }) {
  if (points.length < 2) {
    return <p className="text-sm text-muted">Aún no hay cambios de precio. El historial se llena con cada actualización.</p>;
  }
  // Extend the last price to "now" so a flat stretch reads as a step.
  const data = [...points, { date: new Date().toISOString(), price: points.at(-1)!.price }];
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
          <XAxis dataKey="date" tickFormatter={day} stroke="var(--muted)" fontSize={12} />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => `₡${Math.round(v / 1000)}k`}
            stroke="var(--muted)"
            fontSize={12}
            width={64}
          />
          <Tooltip
            formatter={(v) => formatPrice(Number(v))}
            labelFormatter={(l) => new Date(String(l)).toLocaleString("es-CR")}
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6 }}
          />
          <Line type="stepAfter" dataKey="price" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
