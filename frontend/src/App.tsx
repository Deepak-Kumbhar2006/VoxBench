import { useCallback, useEffect, useState } from "react";
import { ModelSelection } from "./components/ModelSelection";
import { LiveBenchmark } from "./components/LiveBenchmark";
import { SummaryReport } from "./components/SummaryReport";
import { getHealth } from "./services/api";
import { createSession, loadSession, saveSession } from "./utils/session";
import type { SessionData } from "./types";

type Screen = "selection" | "benchmark" | "summary";

function App() {
  const [screen, setScreen] = useState<Screen>("selection");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [backendReady, setBackendReady] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkHealth = useCallback(() => {
    setChecking(true);
    getHealth()
      .then(() => setBackendReady(true))
      .catch(() => setBackendReady(false))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  if (checking || !backendReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark text-white">
        <div className="max-w-md text-center">
          <h2 className="mb-4 text-2xl font-bold">
            {checking ? "Connecting to backend..." : "Backend Not Ready"}
          </h2>
          <p className="text-gray-400">
            Make sure the backend is running at http://localhost:5000
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Run: npm run dev (in /backend folder)
          </p>
          {!checking && (
            <button
              type="button"
              onClick={checkHealth}
              className="mt-6 rounded-lg bg-primary px-5 py-2 font-semibold hover:bg-blue-600"
            >
              Retry connection
            </button>
          )}
        </div>
      </div>
    );
  }

  if (screen === "selection") {
    return (
      <ModelSelection
        onContinue={(models) => {
          setSelectedModels(models);
          const nextSession = createSession(models);
          setSessionData(nextSession);
          saveSession(nextSession);
          setScreen("benchmark");
        }}
      />
    );
  }

  if (screen === "summary" && sessionData) {
    return (
      <SummaryReport
        session={sessionData}
        onBack={() => setScreen("benchmark")}
      />
    );
  }

  return (
    <LiveBenchmark
      selectedModels={selectedModels}
      initialSession={sessionData ?? loadSession()}
      onSessionChange={setSessionData}
      onBack={() => setScreen("selection")}
      onSummarise={(session) => {
        setSessionData(session);
        saveSession(session);
        setScreen("summary");
      }}
    />
  );
}

export default App;
