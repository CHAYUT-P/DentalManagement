import React from "react";
import { createRoot } from "react-dom/client";

// the desktop app can't reach Google Fonts (its CSP only allows 'self'), so the
// two families the web console gets from next/font ship inside the bundle
import "@fontsource/prompt/300.css";
import "@fontsource/prompt/400.css";
import "@fontsource/prompt/500.css";
import "@fontsource/prompt/600.css";
import "@fontsource/mitr/400.css";
import "@fontsource/mitr/500.css";

import App from "./App";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
