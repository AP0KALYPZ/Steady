import { isTauri } from "../lib/platform";
import { BrowserRepository } from "./browserRepository";
import type { SteadyRepository } from "./repository";

let repositoryPromise: Promise<SteadyRepository> | null = null;

export function getRepository(): Promise<SteadyRepository> {
  if (!repositoryPromise) {
    repositoryPromise = isTauri()
      ? import("./tauriDriver").then((module) => module.openSqliteRepository())
      : Promise.resolve(new BrowserRepository());
  }
  return repositoryPromise;
}

/** Test-only seam; production code only calls `getRepository`. */
export function setRepositoryForTests(
  repository: SteadyRepository | null,
): void {
  repositoryPromise = repository ? Promise.resolve(repository) : null;
}

export type { SteadyRepository } from "./repository";
