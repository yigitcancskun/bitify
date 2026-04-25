import { ImageUp, Loader2, Wand2 } from "lucide-react";

type Props = {
  front: File | null;
  back: File | null;
  userInput: string;
  loading: boolean;
  onFrontChange: (file: File | null) => void;
  onBackChange: (file: File | null) => void;
  onUserInputChange: (value: string) => void;
  onGenerate: () => void;
};

export function UploadPanel({
  front,
  back,
  userInput,
  loading,
  onFrontChange,
  onBackChange,
  onUserInputChange,
  onGenerate
}: Props) {
  return (
    <section className="glass-panel rounded-[28px] p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Upload body photos</h2>
        </div>
        <ImageUp className="text-mint" size={24} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FileDrop label="Front" file={front} onChange={onFrontChange} />
        <FileDrop label="Back" file={back} onChange={onBackChange} />
      </div>

      <label className="mt-3 grid gap-2">
        <span className="text-sm text-slate-700">Today&apos;s body context</span>
        <textarea
          value={userInput}
          onChange={(event) => onUserInputChange(event.target.value)}
          placeholder="Bugun ne yaptin, ne yedin, ne ictin, hangi hareketleri yaptin?"
          className="min-h-[96px] rounded-2xl border border-mint/25 bg-mint/10 p-3 text-sm text-slate-800 outline-none transition focus:border-violet"
          maxLength={1200}
        />
      </label>

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
    <label
      tabIndex={0}
      onPaste={handlePaste}
      className="grid min-h-[132px] cursor-pointer place-items-center rounded-2xl border border-dashed border-mint/25 bg-mint/10 p-4 text-center outline-none transition hover:border-violet/70 focus:border-violet/70 focus:ring-2 focus:ring-mint/30"
    >
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <span className="grid gap-2">
        <span className="text-sm font-semibold">{label} body photo</span>
        <span className="break-all text-xs text-slate-600">{file ? file.name : "JPG / PNG / paste image or URL"}</span>
      </span>
    </label>
  );
}
