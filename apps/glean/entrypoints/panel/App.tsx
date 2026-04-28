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
          <Empty capturing={capturing} />
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
    <header className="flex h-11 shrink-0 items-center gap-3 border-b border-white/5 bg-zinc-900/60 px-3 text-xs backdrop-blur">
      <span className="font-medium tracking-tight text-zinc-200">Glean</span>
      <span className="text-[11px] tabular-nums text-zinc-500">
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
      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1.5 rounded-md border border-white/10 bg-zinc-800/60 px-2 py-1 text-zinc-300 hover:bg-zinc-800"
          title={capturing ? "Pause capture" : "Resume capture"}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              capturing ? "bg-zinc-100" : "bg-zinc-500"
            }`}
          />
          {capturing ? "Capturing" : "Paused"}
        </button>
        {spec && selected && <DownloadButton spec={spec} origin={selected} />}
        <button
          type="button"
          onClick={onClearAll}
          className="rounded-md border border-white/10 bg-zinc-800/60 px-2 py-1 text-zinc-300 hover:bg-zinc-800"
          title="Clear all data"
        >
          Clear
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
        className="flex items-center gap-2 rounded-md border border-white/10 bg-zinc-800/60 px-2 py-1 font-mono text-[11px] text-zinc-200 hover:bg-zinc-800"
      >
        <span className="truncate">{stripScheme(selected)}</span>
        <span className="tabular-nums text-zinc-500">{selectedCount}</span>
        <svg
          aria-hidden="true"
          width="8"
          height="8"
          viewBox="0 0 8 8"
          className="fill-current text-zinc-500"
        >
          <path d="M1 2 L4 6 L7 2 Z" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-80 overflow-hidden rounded-lg border border-white/10 bg-zinc-900 shadow-2xl shadow-black/60">
          <div className="border-b border-white/5 p-2">
            <input
              autoFocus
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter origins…"
              className="w-full rounded-md bg-zinc-950 px-2 py-1 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>
          <ul className="max-h-80 overflow-y-auto py-1">
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
      className={`group mx-1 flex items-stretch rounded-md ${
        isSelected ? "bg-zinc-800/80" : "hover:bg-zinc-800/50"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className={`flex-1 truncate px-2.5 py-1.5 text-left font-mono text-[11px] ${
          isSelected ? "text-white" : "text-zinc-300"
        }`}
      >
        {stripScheme(origin)}
      </button>
      <span className="flex items-center px-2 text-[11px] tabular-nums text-zinc-500">
        {count}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
        title={`Drop ${origin}`}
        className="px-2 text-xs text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400"
      >
        ✕
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
    <div className="mx-auto flex h-full max-w-xl flex-col gap-4 px-6 py-10">
      <div>
        <h2 className="text-base font-medium tracking-tight text-zinc-100">
          Pick an origin to inspect
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Each origin builds its own OpenAPI 3.1 spec from observed traffic.
        </p>
      </div>
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter origins…"
        className="rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/30"
      />
      <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
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

function Empty({ capturing }: { capturing: boolean }) {
  return (
    <Centered>
      <div className="text-center">
        <p className="text-zinc-300">
          {capturing ? "Listening for traffic…" : "Capture is paused."}
        </p>
        <p className="mt-1 text-zinc-600">
          Browse the page to start building a spec.
        </p>
      </div>
    </Centered>
  );
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
      className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-white hover:bg-white/10"
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
