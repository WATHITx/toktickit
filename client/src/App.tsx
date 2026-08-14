import { useState } from "react";
import { checkSystem, Category } from "./api.js";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  void categories;

  async function handleCheck() {
    // TODO(Issue 4): set loading, call checkSystem(), then either
    //   - success: store categories and show Online + the list, or
    //   - error: show Offline + a useful message.
    setState("loading");

    const result = await checkSystem();

    if (result.online) {
      setCategories(result.categories);
      setState("success");
    } else {
      setState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {
        state != "loading" && (state === "success" ? (
          <div className="alert alert-success mt-4">
            <h2 className="h5 bold">Online</h2>
          </div>
        ) : state === "error" ? (
          <div className="alert alert-danger mt-4">
            <h2 className="h5">Offline</h2>
            <p>The system is currently offline.</p>
          </div>
        ) : null)
      }
      {/* TODO(Issue 4): render loading / success (Online + categories) / error (Offline) states. */}
    </div>
  );
}
