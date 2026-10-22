import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HashRouter } from "react-router-dom";
import App from "../../src/App";
import { AppDataProvider } from "../../src/hooks/useAppData";
import { ToastProvider } from "../../src/components/ui/Toast";
import { DialogProvider } from "../../src/components/dialogs/DialogProvider";
import { ErrorBoundary } from "../../src/components/ErrorBoundary";
import { BrowserRepository } from "../../src/db/browserRepository";
import { setRepositoryForTests } from "../../src/db";
import type { AppSnapshot } from "../../src/types";

export function renderApp(initial: AppSnapshot, route = "/overview") {
  window.location.hash = `#${route}`;
  const repo = new BrowserRepository(initial);
  setRepositoryForTests(repo);
  const user = userEvent.setup();
  const result = render(
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
    </ErrorBoundary>,
  );
  return { user, repo, ...result };
}

export function resetAppState(): void {
  setRepositoryForTests(null);
  localStorage.clear();
  window.location.hash = "";
}
