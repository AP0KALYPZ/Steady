import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "./styles.css";
import App from "./App";
import { AppDataProvider } from "./hooks/useAppData";
import { ToastProvider } from "./components/ui/Toast";
import { DialogProvider } from "./components/dialogs/DialogProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <AppDataProvider>
          <HashRouter>
            <DialogProvider>
              <App />
            </DialogProvider>
          </HashRouter>
        </AppDataProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
