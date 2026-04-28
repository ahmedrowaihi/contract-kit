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
  const { sampleCount, capturing } = usePanelState();
  const [showSpec, setShowSpec] = useState(false);

  const spec = useMemo(
    () => (showSpec ? exportSpec() : null),
    [showSpec, sampleCount],
  );

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-2 text-sm">
        <span className="font-semibold text-emerald-400">Glean</span>
        <span className="text-zinc-500">
          {sampleCount} sample{sampleCount === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCapturing(!capturing)}
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
            onClick={clear}
            className="rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setShowSpec((v) => !v)}
            className="rounded bg-blue-600 px-2 py-1 text-xs font-medium hover:bg-blue-500"
          >
            {showSpec ? "Hide spec" : "Generate spec"}
          </button>
          {spec && <DownloadButton spec={spec} />}
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 text-xs">
        {!spec && (
          <p className="text-zinc-500">
            Capturing network traffic in this DevTools session. Click{" "}
            <span className="font-mono">Generate spec</span> when ready.
          </p>
        )}
        {spec && (
          <pre className="rounded bg-zinc-900 p-3 font-mono text-zinc-200">
            {JSON.stringify(spec, null, 2)}
          </pre>
        )}
      </main>
    </div>
  );
}

function DownloadButton({ spec }: { spec: object }) {
  const onClick = () => {
    const blob = new Blob([JSON.stringify(spec, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "openapi.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
    >
      Download JSON
    </button>
  );
}
