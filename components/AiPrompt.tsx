"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Builds the prompt on the server; the user copies it to their AI and pastes the answer back here. */
export default function AiPrompt({
  comparisonId,
  prompt,
  savedResult,
}: {
  comparisonId: number;
  prompt: string;
  savedResult: string | null;
}) {
  const router = useRouter();
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [answer, setAnswer] = useState(savedResult ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
    } catch {
      setError("No se pudo copiar: selecciona el texto y cópialo a mano.");
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/comparisons/${comparisonId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ aiResult: answer }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "No se pudo guardar");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-line bg-surface p-4">
      <div>
        <h2 className="font-medium">Análisis con IA</h2>
        <p className="text-sm text-muted">
          Genera el prompt, pégalo en la IA que uses y luego pega aquí su respuesta.
        </p>
      </div>

      {!showPrompt ? (
        <button className="btn" onClick={() => setShowPrompt(true)}>Generar prompt</button>
      ) : (
        <div className="space-y-2">
          <textarea readOnly value={prompt} rows={14} className="input w-full font-mono text-xs" />
          <div className="flex items-center gap-3">
            <button className="btn" onClick={copy}>{copied ? "Copiado ✓" : "Copiar prompt"}</button>
            <button className="text-sm text-muted hover:text-foreground" onClick={() => setShowPrompt(false)}>
              Ocultar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="ai-answer" className="block text-sm font-medium">Respuesta de la IA</label>
        <textarea
          id="ai-answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={10}
          placeholder="Pega aquí la respuesta"
          className="input w-full"
        />
        <div className="flex items-center gap-3">
          <button className="btn disabled:opacity-50" disabled={saving} onClick={save}>
            {saving ? "Guardando…" : "Guardar respuesta"}
          </button>
          {error && <span className="text-sm text-deal">{error}</span>}
        </div>
      </div>
    </section>
  );
}
