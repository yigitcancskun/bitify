"use client";

import { ImageUp, Loader2, Wand2 } from "lucide-react";

type Props = {
  front: File | null;
  back: File | null;
  loading: boolean;
  onFrontChange: (file: File | null) => void;
  onBackChange: (file: File | null) => void;
  onGenerate: () => void;
};

export function UploadPanel({ front, back, loading, onFrontChange, onBackChange, onGenerate }: Props) {
  return (
    <section className="glass-panel rounded-[28px] p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600">Avatar generation</p>
          <h2 className="text-2xl font-bold">Upload photos</h2>
        </div>
        <ImageUp className="text-mint" size={24} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FileDrop label="Front" file={front} onChange={onFrontChange} />
        <FileDrop label="Back" file={back} onChange={onBackChange} />
      </div>

      <button
        type="button"
        onClick={onGenerate}
        disabled={!front || !back || loading}
        className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet font-bold shadow-glow transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
        Generate avatar with Wiro (front + back)
      </button>
    </section>
  );
}

function FileDrop({ label, file, onChange }: { label: string; file: File | null; onChange: (file: File | null) => void }) {
  return (
    <label className="grid min-h-[132px] cursor-pointer place-items-center rounded-2xl border border-dashed border-mint/25 bg-mint/10 p-4 text-center transition hover:border-violet/70">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <span className="grid gap-2">
        <span className="text-sm font-semibold">{label} photo</span>
        <span className="break-all text-xs text-slate-600">{file ? file.name : "JPG / PNG"}</span>
      </span>
    </label>
  );
}
