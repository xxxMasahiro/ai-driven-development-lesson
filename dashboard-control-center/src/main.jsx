import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";
import "./design-system.generated.css";

const App = lazy(() => import("./App.jsx"));

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Suspense fallback={<main className="app-shell" aria-busy="true"><section className="view-surface"><p>Loading...</p></section></main>}>
      <App />
    </Suspense>
  </React.StrictMode>,
);
