// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./assets/style.css"; // or "./styles.css" depending on your file name
import { ExtractionProvider } from "./context/ExtractionContext";
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ExtractionProvider>
      <App />
    </ExtractionProvider>
  </React.StrictMode>
);
