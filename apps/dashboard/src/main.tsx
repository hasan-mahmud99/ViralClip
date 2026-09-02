import React from "react";
import { createRoot } from "react-dom/client";

type Token = string;
type Source = Record<string, unknown> & { id: string; title?: string; status?: string; rightsStatus?: string; youtubeVideoId?: string | null };
type Reel = Record<string, unknown> & { id: string; title?: string | null; state?: string; qaScore?: number | null; sourceId?: string };

type Settings = {
  dailyReelTarget?: number;
  publishTimes?: string[];
  approvalMode?: string;
  sourceRightsPolicy?: string;
  commentaryLanguage?: string;
};

function api(token: Token) {
  return {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    async get<T>(path: string): Promise<T> {
      const r = await fetch(path, { headers: this.headers });
      if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
      return (await r.json()) as T;
    },
    async post<T = unknown>(path: string, body?: unknown): Promise<T> {
      const r = await fetch(path, {
        method: "POST",
        headers: this.headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
      return (await r.json()) as T;
    },
    async put<T = unknown>(path: string, body?: unknown): Promise<T> {
      const r = await fetch(path, {
        method: "PUT",
        headers: this.headers,
        body: JSON.stringify(body ?? {}),
      });
      if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
      return (await r.json()) as T;
    },
    async upload(path: string, file: File, extra: Record<string, string>): Promise<unknown> {
      const fd = new FormData();
      for (const [k, v] of Object.entries(extra)) fd.append(k, v);
      fd.append("file", file);
      const r = await fetch(path, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
      return r.json();
    },
  };
}

type Dash = { target: number; publishedToday: number; ready: number; processing: number; failed: number; remaining: number; totalSources: number; totalReels: number };

function App() {
  const [token, setToken] = React.useState<Token>(() => sessionStorage.getItem("vc_token") ?? "");
  const [login, setLogin] = React.useState("");
  const [dash, setDash] = React.useState<Dash | null>(null);
  const [sources, setSources] = React.useState<Source[]>([]);
  const [reels, setReels] = React.useState<Reel[]>([]);
  const [settings, setSettings] = React.useState<Settings | null>(null);
  const [error, setError] = React.useState<string>("");
  const [msg, setMsg] = React.useState<string>("");
  const [running, setRunning] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!token) return;
    const a = api(token);
    try {
      const [d, s, r, cfg] = await Promise.all([
        a.get<Dash>("/api/dashboard"),
        a.get<{ sources: Source[] }>("/api/sources"),
        a.get<{ reels: Reel[] }>("/api/reels"),
        a.get<{ settings: Settings | null }>("/api/settings"),
      ]);
      setDash(d);
      setSources(s.sources);
      setReels(r.reels);
      setSettings(cfg.settings);
      setError("");
    } catch (e) {
      setError(String(e));
    }
  }, [token]);

  React.useEffect(() => {
    if (token) void refresh();
  }, [token, refresh]);

  async function act(fn: () => Promise<unknown>, okMsg: string) {
    setRunning(true);
    setMsg("");
    try {
      await fn();
      setMsg(okMsg);
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }

  if (!token) {
    return (
      <main style={{ fontFamily: "system-ui", maxWidth: 420, margin: "40px auto" }}>
        <h1>ViralClip — Golpo Box</h1>
        <input value={login} onChange={(e) => setLogin(e.target.value)} type="password" placeholder="Admin password" style={inp} />
        <button style={btn} onClick={() => { sessionStorage.setItem("vc_token", login); setToken(login); }}>Login</button>
      </main>
    );
  }

  const a = api(token);

  return (
    <main style={{ fontFamily: "system-ui", padding: 24, maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>ViralClip — Golpo Box</h1>
        <div>
          <button style={btn} onClick={() => void refresh()}>Refresh</button>{" "}
          <button style={btn} onClick={() => { sessionStorage.removeItem("vc_token"); setToken(""); }}>Logout</button>
        </div>
      </div>
      {error && <p style={{ color: "#b00020" }}>{error}</p>}
      {msg && <p style={{ color: "green" }}>{msg}</p>}
      {running && <p style={{ color: "#888" }}>working…</p>}

      {dash && (
        <section>
          <h2>Today</h2>
          <table style={tbl}>
            <tbody>
              {[["Target", dash.target], ["Published today", dash.publishedToday], ["Ready", dash.ready], ["Processing", dash.processing], ["Failed", dash.failed], ["Remaining", dash.remaining], ["Total sources", dash.totalSources], ["Total reels", dash.totalReels]].map(([k, v]) => (
                <tr key={String(k)}><td>{k}</td><td>{String(v)}</td></tr>
              ))}
            </tbody>
          </table>
          <button style={btn} onClick={() => act(() => a.post("/api/jobs/run-once"), "worker cycle triggered")}>Run worker cycle now</button>
        </section>
      )}

      <section>
        <h2>Settings</h2>
        <table style={tbl}>
          <tbody>
            <tr><td>Daily reel target</td><td><input type="number" value={settings?.dailyReelTarget ?? 3} onChange={(e) => setSettings({ ...settings, dailyReelTarget: Number(e.target.value) })} style={inp} /></td></tr>
            <tr><td>Publish times (HH:MM, comma)</td><td><input value={(settings?.publishTimes ?? []).join(",")} onChange={(e) => setSettings({ ...settings, publishTimes: e.target.value.split(",").map((s) => s.trim()) })} style={inp} /></td></tr>
            <tr><td>Approval mode</td><td>
              <select value={settings?.approvalMode ?? "manual"} onChange={(e) => setSettings({ ...settings, approvalMode: e.target.value })}>
                <option value="manual">manual</option><option value="automatic">automatic</option><option value="hybrid">hybrid</option>
              </select>
            </td></tr>
            <tr><td>Rights policy</td><td>
              <select value={settings?.sourceRightsPolicy ?? "approved_only"} onChange={(e) => setSettings({ ...settings, sourceRightsPolicy: e.target.value })}>
                <option value="manual">manual</option><option value="approved_only">approved_only</option><option value="licensed_only">licensed_only</option><option value="trusted_sources">trusted_sources</option>
              </select>
            </td></tr>
            <tr><td>Commentary language</td><td>
              <select value={settings?.commentaryLanguage ?? "bn"} onChange={(e) => setSettings({ ...settings, commentaryLanguage: e.target.value })}>
                <option value="bn">bn</option><option value="en">en</option>
              </select>
            </td></tr>
          </tbody>
        </table>
        <button style={btn} onClick={() => act(() => a.put("/api/settings", settings), "settings saved")}>Save settings</button>
      </section>

      <section>
        <h2>Upload authorized source</h2>
        <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const file = fd.get("file") as File; if (file) act(() => a.upload("/api/sources/upload", file, { title: String(fd.get("title") ?? file.name) }), "uploaded"); }}>
          <input name="title" placeholder="Title" style={inp} />
          <input name="file" type="file" accept="video/*" required style={inp} />
          <button style={btn} type="submit" disabled={running}>Upload</button>
        </form>
      </section>

      <section>
        <h2>Sources ({sources.length})</h2>
        <table style={tbl}>
          <thead><tr><th>Title</th><th>Status</th><th>Rights</th><th>Actions</th></tr></thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id}>
                <td>{s.title}</td>
                <td>{s.status}</td>
                <td>{s.rightsStatus}</td>
                <td>
                  <button style={btn} onClick={() => act(() => a.post(`/api/sources/${s.id}/approve`), "approved")}>Approve</button>{" "}
                  <button style={btnDanger} onClick={() => act(() => a.post(`/api/sources/${s.id}/block`), "blocked")}>Block</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Reels ({reels.length})</h2>
        <table style={tbl}>
          <thead><tr><th>Title</th><th>State</th><th>QA</th><th>Actions</th></tr></thead>
          <tbody>
            {reels.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{r.state}</td>
                <td>{r.qaScore ?? "—"}</td>
                <td>
                  <button style={btn} disabled={r.state === "READY"} onClick={() => act(() => a.post(`/api/reels/${r.id}/approve`), "reel ready")}>Ready</button>{" "}
                  <button style={btn} onClick={() => act(() => a.post(`/api/reels/${r.id}/publish`), "publish requested")}>Publish Now</button>{" "}
                  <button style={btnDanger} onClick={() => act(() => a.post(`/api/reels/${r.id}/reject`), "rejected")}>Reject</button>{" "}
                  <button style={btn} onClick={() => act(() => a.post(`/api/reels/${r.id}/retry`), "retry queued")}>Retry</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

const inp: React.CSSProperties = { margin: 6, padding: 8, width: 300 };
const btn: React.CSSProperties = { margin: 4, padding: "6px 10px", cursor: "pointer" };
const btnDanger: React.CSSProperties = { ...btn, backgroundColor: "#ffd9d9" };
const tbl: React.CSSProperties = { borderCollapse: "collapse" };

const el = document.getElementById("root");
if (el) createRoot(el).render(<App />);
