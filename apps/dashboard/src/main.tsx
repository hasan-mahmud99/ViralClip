import React from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [health, setHealth] = React.useState<string>("loading");
  React.useEffect(() => {
    fetch("/healthz")
      .then((r) => r.json())
      .then((j) => setHealth(JSON.stringify(j)))
      .catch((e) => setHealth(String(e)));
  }, []);
  return (
    <main style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>ViralClip — Golpo Box</h1>
      <p>Dashboard placeholder. API health: {health}</p>
    </main>
  );
}

const el = document.getElementById("root");
if (el) createRoot(el).render(<App />);
