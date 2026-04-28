import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
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
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState("");
  const [spec, setSpec] = useState<object | null>(null);

  const visibleOrigins = useMemo(
    () =>
      origins.filter(
        ([o]) =>
          !hidden.has(o) && o.toLowerCase().includes(filter.toLowerCase()),
      ),
    [origins, hidden, filter],
  );

  useEffect(() => {
    if (visibleOrigins.length === 0) {
      setSelected(null);
      return;
    }
    if (!selected || !visibleOrigins.some(([o]) => o === selected)) {
      setSelected(visibleOrigins[0][0] ?? null);
    }
  }, [visibleOrigins, selected]);

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
        <Sidebar
          origins={visibleOrigins}
          selected={selected}
          filter={filter}
          onFilter={setFilter}
          onSelect={setSelected}
          onHide={(o) =>
            setHidden((prev) => {
              const next = new Set(prev);
              next.add(o);
              return next;
            })
          }
          hiddenCount={hidden.size}
          onClearHidden={() => setHidden(new Set())}
        />
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
  filter: string;
  onFilter: (s: string) => void;
  onSelect: (origin: string) => void;
  onHide: (origin: string) => void;
  hiddenCount: number;
  onClearHidden: () => void;
}

function Sidebar({
  origins,
  selected,
  filter,
  onFilter,
  onSelect,
  onHide,
  hiddenCount,
  onClearHidden,
}: SidebarProps) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-3 py-2">
        <input
          type="search"
          value={filter}
          onChange={(e) => onFilter(e.target.value)}
          placeholder="Filter origins…"
          className="w-full rounded bg-zinc-900 px-2 py-1 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
      <ul className="flex-1 overflow-y-auto">
        {origins.length === 0 && (
          <li className="px-3 py-2 text-xs text-zinc-600">
            {filter ? "No matches." : "Waiting for traffic…"}
          </li>
        )}
        {origins.map(([origin, count]) => (
          <li
            key={origin}
            className={`group flex items-stretch ${
              selected === origin ? "bg-zinc-900" : "hover:bg-zinc-900"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(origin)}
              className={`flex-1 truncate px-3 py-1.5 text-left font-mono text-xs ${
                selected === origin ? "text-emerald-400" : ""
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
                onHide(origin);
              }}
              title="Hide this origin"
              className="px-2 text-xs text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-zinc-300"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={onClearHidden}
          className="border-t border-zinc-800 px-3 py-2 text-left text-xs text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
        >
          Show {hiddenCount} hidden
        </button>
      )}
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
      <main className="flex flex-1 items-center justify-center text-xs text-zinc-500">
        Browse the page to start capturing JSON traffic.
      </main>
    );
  }
  if (!selected || !spec) {
    return (
      <main className="flex flex-1 items-center justify-center text-xs text-zinc-500">
        Pick an origin from the sidebar.
      </main>
    );
  }
  return (
    <main className="flex-1 overflow-auto">
      <ApiReferenceReact
        configuration={{
          content: spec,
          theme: "deepSpace",
          layout: "modern",
          hideDarkModeToggle: true,
        }}
      />
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
