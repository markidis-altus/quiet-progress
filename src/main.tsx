import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { requestPersistence } from "./lib/store";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

requestPersistence();

// Offline support once hosted over https (service workers don't run from file://)
if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
