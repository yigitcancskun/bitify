import { ImageUp, Loader2, Wand2 } from "lucide-react";

type Props = {
  front: File | null;
  back: File | null;
  loading: boolean;
  onFrontChange: (file: File | null) => void;
  onBackChange: (file: File | null) => void;
  onGenerate: () => void;
};

export function UploadPanel({
  front,
  back,
  loading,
  onFrontChange,
  onBackChange,
  onGenerate
}: Props) {
  return (
    <section className="glass-panel rounded-[28px] p-5">
      <div className="mb-6 grid place-items-center">
        <ImageUp className="text-mint" size={58} strokeWidth={2.2} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FileDrop label="Front pose" file={front} onChange={onFrontChange} />
        <FileDrop label="Back pose" file={back} onChange={onBackChange} />
      </div>

      <button
        type="button"
        onClick={onGenerate}
        disabled={!front || !back || loading}
        className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet font-bold shadow-glow transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
        Create avatar
      </button>
    </section>
  );
}

async function fileFromImageUrl(url: string, label: string): Promise<File | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) return null;
    const extension = blob.type.split("/")[1] || "png";
    return new File([blob], `${label.toLowerCase()}-pasted.${extension}`, { type: blob.type });
  } catch {
    return null;
  }
}

function FileDrop({ label, file, onChange }: { label: string; file: File | null; onChange: (file: File | null) => void }) {
  async function handlePaste(event: React.ClipboardEvent<HTMLLabelElement>) {
    const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"));
    if (imageItem) {
      const pastedFile = imageItem.getAsFile();
      if (pastedFile) {
        event.preventDefault();
        onChange(new File([pastedFile], `${label.toLowerCase()}-pasted.png`, { type: pastedFile.type || "image/png" }));
      }
      return;
    }

    const text = event.clipboardData.getData("text/plain").trim();
    if (/^https?:\/\/.+/i.test(text)) {
      event.preventDefault();
      const pastedFromUrl = await fileFromImageUrl(text, label);
      if (pastedFromUrl) onChange(pastedFromUrl);
    }
  }

  return (
    <div className="rounded-[24px] border border-mint/25 bg-mint/10 p-4">
      <label className="mb-3 block text-sm font-semibold text-slate-800">{label}</label>
      <label
        tabIndex={0}
        onPaste={handlePaste}
        className="grid min-h-[112px] cursor-pointer place-items-center rounded-2xl p-4 text-center outline-none transition hover:bg-white/20 focus:ring-2 focus:ring-mint/30"
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />
        <span className="break-all text-sm text-slate-700">{file ? file.name : "Upload image"}</span>
      </label>
    </div>
  );
}
