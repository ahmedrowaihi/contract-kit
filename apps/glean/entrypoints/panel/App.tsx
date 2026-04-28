import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  bindNetworkCapture,
  clear,
  clearOrigin,
  exportSpec,
  setCapturing,
  usePanelState,
} from "./state";

export function App() {
  useEffect(bindNetworkCapture, []);
  const { totalSamples, capturing, origins } = usePanelState();
  const [selected, setSelected] = useState<string | null>(null);
  const [spec, setSpec] = useState<object | null>(null);

  useEffect(() => {
    if (selected && !origins.some(([o]) => o === selected)) setSelected(null);
  }, [origins, selected]);

  useEffect(() => {
    if (!selected) {
      setSpec(null);
      return;
    }
    let stale = false;
    exportSpec(selected).then((doc) => {
      if (!stale) setSpec(doc);
    });
    return () => {
      stale = true;
    };
  }, [selected, totalSamples]);

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-100">
      <Header
        totalSamples={totalSamples}
        capturing={capturing}
        origins={origins}
        selected={selected}
        spec={spec}
        onToggle={() => setCapturing(!capturing)}
        onClearAll={clear}
        onSelect={setSelected}
        onClearOrigin={(o) => {
          clearOrigin(o);
          if (selected === o) setSelected(null);
        }}
      />
      <main className="flex-1 overflow-hidden">
        {origins.length === 0 ? (
          <Empty />
        ) : !selected ? (
          <OriginPicker
            origins={origins}
            onSelect={setSelected}
            onClearOrigin={(o) => clearOrigin(o)}
          />
        ) : !spec ? (
          <Centered>Loading spec…</Centered>
        ) : (
          <div className="h-full overflow-auto">
            <ApiReferenceReact
              configuration={{
                content: spec,
                theme: "deepSpace",
                layout: "modern",
                hideDarkModeToggle: true,
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}

interface HeaderProps {
  totalSamples: number;
  capturing: boolean;
  origins: Array<[string, number]>;
  selected: string | null;
  spec: object | null;
  onToggle: () => void;
  onClearAll: () => void;
  onSelect: (origin: string) => void;
  onClearOrigin: (origin: string) => void;
}

function Header({
  totalSamples,
  capturing,
  origins,
  selected,
  spec,
  onToggle,
  onClearAll,
  onSelect,
  onClearOrigin,
}: HeaderProps) {
  return (
    <header className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-2 text-sm">
      <span className="font-semibold text-emerald-400">Glean</span>
      <span className="text-zinc-500">
        {totalSamples} sample{totalSamples === 1 ? "" : "s"}
      </span>
      {selected && (
        <OriginDropdown
          origins={origins}
          selected={selected}
          onSelect={onSelect}
          onClearOrigin={onClearOrigin}
        />
      )}
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
        {spec && selected && <DownloadButton spec={spec} origin={selected} />}
        <button
          type="button"
          onClick={onClearAll}
          className="rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
          title="Clear all data"
        >
          Clear all
        </button>
      </div>
    </header>
  );
}

interface OriginDropdownProps {
  origins: Array<[string, number]>;
  selected: string;
  onSelect: (origin: string) => void;
  onClearOrigin: (origin: string) => void;
}

function OriginDropdown({
  origins,
  selected,
  onSelect,
  onClearOrigin,
}: OriginDropdownProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const selectedCount = origins.find(([o]) => o === selected)?.[1] ?? 0;
  const visible = useMemo(
    () =>
      origins.filter(([o]) => o.toLowerCase().includes(filter.toLowerCase())),
    [origins, filter],
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded bg-zinc-800 px-2 py-1 font-mono text-xs hover:bg-zinc-700"
      >
        <span className="truncate">{stripScheme(selected)}</span>
        <span className="text-zinc-500">{selectedCount}</span>
        <span className="text-zinc-500">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-80 rounded border border-zinc-800 bg-zinc-900 shadow-xl">
          <div className="border-b border-zinc-800 p-2">
            <input
              autoFocus
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter origins…"
              className="w-full rounded bg-zinc-950 px-2 py-1 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {visible.length === 0 && (
              <li className="px-3 py-2 text-xs text-zinc-600">No matches.</li>
            )}
            {visible.map(([o, n]) => (
              <OriginRow
                key={o}
                origin={o}
                count={n}
                isSelected={o === selected}
                onSelect={() => {
                  onSelect(o);
                  setOpen(false);
                }}
                onClear={() => onClearOrigin(o)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface OriginRowProps {
  origin: string;
  count: number;
  isSelected: boolean;
  onSelect: () => void;
  onClear: () => void;
}

function OriginRow({
  origin,
  count,
  isSelected,
  onSelect,
  onClear,
}: OriginRowProps) {
  return (
    <li
      className={`group flex items-stretch ${
        isSelected ? "bg-zinc-950" : "hover:bg-zinc-950"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className={`flex-1 truncate px-3 py-1.5 text-left font-mono text-xs ${
          isSelected ? "text-emerald-400" : ""
        }`}
      >
        {stripScheme(origin)}
      </button>
      <span className="flex items-center px-2 text-xs text-zinc-500">
        {count}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
        title={`Drop ${origin}`}
        className="px-2 text-xs text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-red-400"
      >
        🗑
      </button>
    </li>
  );
}

interface OriginPickerProps {
  origins: Array<[string, number]>;
  onSelect: (origin: string) => void;
  onClearOrigin: (origin: string) => void;
}

function OriginPicker({ origins, onSelect, onClearOrigin }: OriginPickerProps) {
  const [filter, setFilter] = useState("");
  const visible = useMemo(
    () =>
      origins.filter(([o]) => o.toLowerCase().includes(filter.toLowerCase())),
    [origins, filter],
  );

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-3 px-6 py-8">
      <div>
        <h2 className="text-lg font-semibold">Pick an origin to inspect</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Each origin builds its own OpenAPI spec from observed traffic.
        </p>
      </div>
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter origins…"
        className="rounded bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
      <ul className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {visible.length === 0 && (
          <li className="text-xs text-zinc-600">No matches.</li>
        )}
        {visible.map(([o, n]) => (
          <OriginRow
            key={o}
            origin={o}
            count={n}
            isSelected={false}
            onSelect={() => onSelect(o)}
            onClear={() => onClearOrigin(o)}
          />
        ))}
      </ul>
    </div>
  );
}

function Empty() {
  return <Centered>Browse the page to start capturing JSON traffic.</Centered>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center text-xs text-zinc-500">
      {children}
    </div>
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
      Download
    </button>
  );
}

function stripScheme(origin: string): string {
  return origin.replace(/^https?:\/\//, "");
}

function slugify(origin: string): string {
  return stripScheme(origin).replace(/[^a-z0-9]+/gi, "-");
}
