import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { requestPersistence } from "./lib/store";
import { registerServiceWorker } from "./lib/offline";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

requestPersistence();
registerServiceWorker();
