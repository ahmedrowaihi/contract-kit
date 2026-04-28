import { createRoot } from "react-dom/client";
import "../../assets/tailwind.css";
import { App } from "./App";

const root = document.getElementById("app");
if (!root) throw new Error("missing #app");
createRoot(root).render(<App />);
