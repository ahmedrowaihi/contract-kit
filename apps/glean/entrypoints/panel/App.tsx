import { useEffect, useMemo, useState } from "react";
import {
  bindNetworkCapture,
  clear,
  exportSpec,
  setCapturing,
  usePanelState,
} from "./state";

export function App() {
  useEffect(bindNetworkCapture, []);
  const { totalSamples, capturing, origins } = usePanelState();
  const [selected, setSelected] = useState<string | null>(null);

  // Auto-select first origin once one shows up.
  useEffect(() => {
    if (selected === null && origins.length > 0)
      setSelected(origins[0][0] ?? null);
  }, [origins, selected]);

  // Drop the selection if its origin is cleared.
  useEffect(() => {
    if (selected && !origins.some(([o]) => o === selected)) setSelected(null);
  }, [origins, selected]);

  const spec = useMemo(
    () => (selected ? exportSpec(selected) : null),
    [selected, totalSamples],
  );

  return (
    <div className="flex h-full flex-col">
      <Header
        totalSamples={totalSamples}
        capturing={capturing}
        onToggle={() => setCapturing(!capturing)}
        onClear={clear}
        spec={spec}
        selected={selected}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar origins={origins} selected={selected} onSelect={setSelected} />
        <Main spec={spec} selected={selected} totalSamples={totalSamples} />
      </div>
    </div>
  );
}

interface HeaderProps {
  totalSamples: number;
  capturing: boolean;
  onToggle: () => void;
  onClear: () => void;
  spec: object | null;
  selected: string | null;
}

function Header({
  totalSamples,
  capturing,
  onToggle,
  onClear,
  spec,
  selected,
}: HeaderProps) {
  return (
    <header className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-2 text-sm">
      <span className="font-semibold text-emerald-400">Glean</span>
      <span className="text-zinc-500">
        {totalSamples} sample{totalSamples === 1 ? "" : "s"}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className={`rounded px-2 py-1 text-xs font-medium ${
            capturing
              ? "bg-emerald-600 hover:bg-emerald-500"
              : "bg-zinc-700 hover:bg-zinc-600"
          }`}
        >
          {capturing ? "● Capturing" : "○ Paused"}
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
        >
          Clear
        </button>
        {spec && selected && <DownloadButton spec={spec} origin={selected} />}
      </div>
    </header>
  );
}

interface SidebarProps {
  origins: Array<[string, number]>;
  selected: string | null;
  onSelect: (origin: string) => void;
}

function Sidebar({ origins, selected, onSelect }: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-950">
      <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-500">
        Origins
      </div>
      {origins.length === 0 && (
        <p className="px-3 py-2 text-xs text-zinc-600">Waiting for traffic…</p>
      )}
      <ul>
        {origins.map(([origin, count]) => (
          <li key={origin}>
            <button
              type="button"
              onClick={() => onSelect(origin)}
              className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-zinc-900 ${
                selected === origin ? "bg-zinc-900 text-emerald-400" : ""
              }`}
            >
              <span className="truncate font-mono">{stripScheme(origin)}</span>
              <span className="shrink-0 text-zinc-500">{count}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

interface MainProps {
  spec: object | null;
  selected: string | null;
  totalSamples: number;
}

function Main({ spec, selected, totalSamples }: MainProps) {
  if (totalSamples === 0) {
    return (
      <main className="flex-1 overflow-auto p-4 text-xs text-zinc-500">
        Browse the page to start capturing JSON traffic.
      </main>
    );
  }
  if (!selected || !spec) {
    return (
      <main className="flex-1 overflow-auto p-4 text-xs text-zinc-500">
        Pick an origin from the sidebar to see its inferred OpenAPI spec.
      </main>
    );
  }
  return (
    <main className="flex-1 overflow-auto p-4 text-xs">
      <pre className="rounded bg-zinc-900 p-3 font-mono text-zinc-200">
        {JSON.stringify(spec, null, 2)}
      </pre>
    </main>
  );
}

function DownloadButton({ spec, origin }: { spec: object; origin: string }) {
  const onClick = () => {
    const blob = new Blob([JSON.stringify(spec, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(origin)}.openapi.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded bg-blue-600 px-2 py-1 text-xs font-medium hover:bg-blue-500"
    >
      Download JSON
    </button>
  );
}

function stripScheme(origin: string): string {
  return origin.replace(/^https?:\/\//, "");
}

function slugify(origin: string): string {
  return stripScheme(origin).replace(/[^a-z0-9]+/gi, "-");
}
