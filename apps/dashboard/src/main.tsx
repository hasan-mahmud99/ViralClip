import React from "react";
import { createRoot } from "react-dom/client";

type Source = { id: string; title?: string | null; status?: string; rightsStatus?: string; channelName?: string | null; localFilePath?: string | null; updatedAt?: string };
type Reel = { id: string; title?: string | null; state?: string; qaScore?: number | null; sourceId?: string; scheduledFor?: string | null; publishedAt?: string | null; platformPostId?: string | null; errorMessage?: string | null };
type Dash = { target: number; publishedToday: number; ready: number; processing: number; failed: number; remaining: number; totalSources: number; totalReels: number };
type Settings = { dailyReelTarget?: number; publishTimes?: string[]; approvalMode?: string; sourceRightsPolicy?: string; commentaryLanguage?: string };

const cx = {
  body: { fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif", background: "#0f1117", color: "#e6e9f0", minHeight: "100vh", margin: 0, padding: 0 } as const,
  shell: { display: "flex", minHeight: "100vh" } as const,
  sidebar: { width: 230, background: "#171a23", padding: "22px 14px", borderRight: "1px solid #262a37", position: "sticky", top: 0, height: "100vh", boxSizing: "border-box" } as const,
  logo: { fontSize: 17, fontWeight: 700, margin: "0 0 22px 8px", letterSpacing: 0.2 } as const,
  navBtn: (active: boolean) =>
    ({ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", margin: "2px 0", borderRadius: 8, border: 0, cursor: "pointer", background: active ? "#2a6ef0" : "transparent", color: active ? "#fff" : "#aab2c5", fontSize: 14, fontWeight: active ? 600 : 400 }) as const,
  content: { flex: 1, padding: "28px 32px", maxWidth: 1200, boxSizing: "border-box" } as const,
  h1: { fontSize: 22, margin: "0 0 4px" } as const,
  sub: { color: "#8b93a7", fontSize: 13, margin: "0 0 24px" } as const,
  card: { background: "#171a23", border: "1px solid #262a37", borderRadius: 12, padding: 18, marginBottom: 22 } as const,
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 } as const,
  stat: { background: "#1c2030", border: "1px solid #2a3042", borderRadius: 10, padding: "14px 16px" } as const,
  statNum: { fontSize: 24, fontWeight: 700, margin: 0 } as const,
  statLabel: { fontSize: 12, color: "#8b93a7", margin: "4px 0 0" } as const,
  btn: (kind: "primary" | "danger" | "ghost" = "ghost") =>
    ({ margin: 3, padding: "7px 12px", borderRadius: 7, border: 0, cursor: "pointer", fontSize: 13, fontWeight: 600, background: kind === "primary" ? "#2a6ef0" : kind === "danger" ? "#d7433f" : "#232838", color: "#fff", opacity: 0.95 }) as const,
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 } as const,
  th: { textAlign: "left", padding: "8px 10px", color: "#8b93a7", borderBottom: "1px solid #262a37", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 } as const,
  td: { padding: "8px 10px", borderBottom: "1px solid #1e2230", verticalAlign: "top" } as const,
  input: { margin: 3, padding: "8px 10px", borderRadius: 7, border: "1px solid #2a3042", background: "#0f1117", color: "#e6e9f0", fontSize: 13, minWidth: 180, boxSizing: "border-box" } as const,
  badge: (color: string) => ({ display: "inline-block", padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: color, color: "#0b0d12" }) as const,
  tag: { fontSize: 11, color: "#8b93a7" } as const,
  err: { color: "#ff8080", fontSize: 13 } as const,
  ok: { color: "#6fdb8f", fontSize: 13 } as const,
  loginCard: { maxWidth: 380, margin: "12vh auto", background: "#171a23", border: "1px solid #262a37", borderRadius: 14, padding: 30 } as const,
};

function stateColor(s: string): string {
  switch (s) {
    case "PUBLISHED": return "#6fdb8f";
    case "READY": return "#57b6ff";
    case "QA_PASSED": return "#57b6ff";
    case "SCHEDULED": return "#b39dff";
    case "FAILED":
    case "REJECTED": return "#ff8080";
    case "TRANSCRIBING":
    case "RENDERING":
    case "UPLOADING": return "#ffd166";
    default: return "#8b93a7";
  }
}

function rightsColor(s: string): string {
  if (s === "USER_APPROVED" || s === "LICENSED" || s === "PERMISSION_GRANTED" || s === "CREATOR_PROVIDED" || s === "PUBLIC_DOMAIN" || s === "CREATIVE_COMMONS") return "#6fdb8f";
  if (s === "BLOCKED") return "#ff8080";
  if (s === "UNKNOWN") return "#ffd166";
  return "#b39dff";
}

function api(token: string) {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  return {
    async get<T>(p: string): Promise<T> { const r = await fetch(p, { headers }); if (!r.ok) throw new Error(await r.text()); return r.json(); },
    async post<T = unknown>(p: string, b?: unknown): Promise<T> { const r = await fetch(p, { method: "POST", headers, body: b === undefined ? undefined : JSON.stringify(b) }); if (!r.ok) throw new Error(await r.text()); return r.json(); },
    async put<T = unknown>(p: string, b?: unknown): Promise<T> { const r = await fetch(p, { method: "PUT", headers, body: JSON.stringify(b ?? {}) }); if (!r.ok) throw new Error(await r.text()); return r.json(); },
    async upload(p: string, file: File, title: string): Promise<unknown> { const fd = new FormData(); fd.append("file", file); fd.append("title", title); const r = await fetch(p, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd }); if (!r.ok) throw new Error(await r.text()); return r.json(); },
  };
}

function App() {
  const [token, setToken] = React.useState(sessionStorage.getItem("vc_token") ?? "");
  const [pw, setPw] = React.useState("");
  const [tab, setTab] = React.useState<"overview" | "sources" | "reels" | "settings" | "upload">("overview");
  const [dash, setDash] = React.useState<Dash | null>(null);
  const [sources, setSources] = React.useState<Source[]>([]);
  const [reels, setReels] = React.useState<Reel[]>([]);
  const [settings, setSettings] = React.useState<Settings>({});
  const [err, setErr] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!token) return;
    const a = api(token);
    try {
      const [d, s, r, c] = await Promise.all([
        a.get<Dash>("/api/dashboard"),
        a.get<{ sources: Source[] }>("/api/sources"),
        a.get<{ reels: Reel[] }>("/api/reels"),
        a.get<{ settings: Settings | null }>("/api/settings"),
      ]);
      setDash(d); setSources(s.sources); setReels(r.reels); if (c.settings) setSettings(c.settings); setErr("");
    } catch (e) { setErr(String(e)); }
  }, [token]);

  React.useEffect(() => { if (token) void refresh(); }, [token, refresh]);

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true); setMsg(""); setErr("");
    try { await fn(); setMsg(ok); await refresh(); } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  }

  if (!token) {
    return (
      <div style={{ ...cx.body, padding: 20 }}>
        <div style={cx.loginCard}>
          <h1 style={{ marginTop: 0 }}>ViralClip</h1>
          <p style={cx.sub}>Golpo Box — Reels automation console</p>
          <input style={{ ...cx.input, width: "92%" }} type="password" placeholder="Admin password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { sessionStorage.setItem("vc_token", pw); setToken(pw); } }} />
          <div style={{ marginTop: 12 }}>
            <button style={cx.btn("primary")} onClick={() => { sessionStorage.setItem("vc_token", pw); setToken(pw); }}>Login</button>
          </div>
        </div>
      </div>
    );
  }
  const a = api(token);

  const nav = (["overview", "sources", "reels", "upload", "settings"] as const).map((t) => ({ t, label: t[0].toUpperCase() + t.slice(1) }));

  return (
    <div style={cx.body}>
      <div style={cx.shell}>
        <aside style={cx.sidebar}>
          <p style={cx.logo}>⧉ ViralClip</p>
          {nav.map(({ t, label }) => (
            <button key={t} style={cx.navBtn(tab === t)} onClick={() => setTab(t)}>{label}</button>
          ))}
          <div style={{ marginTop: 26 }}>
            <button style={cx.navBtn(false)} onClick={() => act(() => a.post("/api/jobs/run-once"), "Worker cycle triggered")}>▶ Run worker cycle</button>
            <button style={cx.navBtn(false)} onClick={() => { sessionStorage.removeItem("vc_token"); setToken(""); }}>Logout</button>
          </div>
          <p style={{ ...cx.tag, marginTop: 18, lineHeight: 1.6 }}>{busy ? "working…" : ""}</p>
        </aside>

        <main style={cx.content}>
          <h1 style={cx.h1}>{tab[0].toUpperCase() + tab.slice(1)}</h1>
          <p style={cx.sub}>{err && <span style={cx.err}>{err}</span>}{!err && msg && <span style={cx.ok}>{msg}</span>}</p>

          {tab === "overview" && dash && (
            <div style={cx.card}>
              <div style={cx.grid}>
                {[["Target", dash.target, "#57b6ff"], ["Published", dash.publishedToday, "#6fdb8f"], ["Ready", dash.ready, "#b39dff"], ["Processing", dash.processing, "#ffd166"], ["Failed", dash.failed, "#ff8080"], ["Remaining", dash.remaining, "#8b93a7"]].map(([l, v, c]) => (
                  <div key={String(l)} style={cx.stat}>
                    <p style={{ ...cx.statNum, color: c as string }}>{String(v)}</p>
                    <p style={cx.statLabel}>{l as string}</p>
                  </div>
                ))}
              </div>
              <p style={cx.tag}>Sources: {dash.totalSources} · Reels: {dash.totalReels}</p>
            </div>
          )}

          {tab === "sources" && (
            <div style={cx.card}>
              <div style={{ overflowX: "auto" }}>
                <table style={cx.table}>
                  <thead><tr><th>Title</th><th>Channel</th><th>Status</th><th>Rights</th><th>File</th><th>Actions</th></tr></thead>
                  <tbody>
                    {sources.map((s) => (
                      <tr key={s.id}>
                        <td>{s.title}</td><td>{s.channelName ?? "—"}</td>
                        <td>{s.status}</td>
                        <td><span style={cx.badge(rightsColor(s.rightsStatus ?? "UNKNOWN"))}>{s.rightsStatus ?? "UNKNOWN"}</span></td>
                        <td style={cx.tag}>{s.localFilePath ? "✓ file" : "metadata only"}</td>
                        <td>
                          <button style={cx.btn("primary")} onClick={() => act(() => a.post(`/api/sources/${s.id}/approve`), "Approved")}>Approve</button>
                          <button style={cx.btn("danger")} onClick={() => act(() => a.post(`/api/sources/${s.id}/block`), "Blocked")}>Block</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "reels" && (
            <div style={cx.card}>
              <div style={{ overflowX: "auto" }}>
                <table style={cx.table}>
                  <thead><tr><th>Title</th><th>State</th><th>QA</th><th>Published</th><th>Post ID</th><th>Actions</th></tr></thead>
                  <tbody>
                    {reels.map((r) => (
                      <tr key={r.id}>
                        <td>{r.title}</td>
                        <td><span style={cx.badge(stateColor(r.state ?? ""))}>{r.state}</span></td>
                        <td>{r.qaScore ?? "—"}</td>
                        <td>{r.publishedAt ? new Date(r.publishedAt).toLocaleString() : "—"}</td>
                        <td style={cx.tag}>{r.platformPostId ?? "—"}</td>
                        <td>
                          <button style={cx.btn("primary")} disabled={r.state === "READY"} onClick={() => act(() => a.post(`/api/reels/${r.id}/approve`), "Marked ready")}>Ready</button>
                          <button style={cx.btn("primary")} onClick={() => act(() => a.post(`/api/reels/${r.id}/publish`), "Publish requested")}>Publish now</button>
                          <button style={cx.btn("danger")} onClick={() => act(() => a.post(`/api/reels/${r.id}/reject`), "Rejected")}>Reject</button>
                          <button style={cx.btn()} onClick={() => act(() => a.post(`/api/reels/${r.id}/retry`), "Retried")}>Retry</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "upload" && (
            <div style={cx.card}>
              <h3 style={{ marginTop: 0 }}>Upload an authorized source file</h3>
              <p style={cx.tag}>Your own video or content you have permission to use. It will wait in RIGHTS_PENDING until you approve it.</p>
              <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const file = f.get("file") as File; if (file) act(() => a.upload("/api/sources/upload", file, String(f.get("title") ?? file.name)), "Uploaded"); }}>
                <input name="title" placeholder="Title" style={cx.input} />
                <input name="file" type="file" accept="video/*" required style={{ ...cx.input, maxWidth: 320 }} />
                <button type="submit" style={cx.btn("primary")}>Upload</button>
              </form>
            </div>
          )}

          {tab === "settings" && (
            <div style={cx.card}>
              <h3 style={{ marginTop: 0 }}>Automation settings</h3>
              <table style={cx.table}>
                <tbody>
                  <tr><td>Daily reel target</td><td><input type="number" value={settings.dailyReelTarget ?? 3} onChange={(e) => setSettings({ ...settings, dailyReelTarget: Number(e.target.value) })} style={cx.input} /></td></tr>
                  <tr><td>Publish times (HH:MM comma-separated)</td><td><input value={(settings.publishTimes ?? []).join(",")} onChange={(e) => setSettings({ ...settings, publishTimes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} style={{ ...cx.input, minWidth: 240 }} /></td></tr>
                  <tr><td>Approval mode</td><td><select value={settings.approvalMode ?? "manual"} onChange={(e) => setSettings({ ...settings, approvalMode: e.target.value })} style={cx.input}><option value="manual">manual</option><option value="automatic">automatic</option><option value="hybrid">hybrid</option></select></td></tr>
                  <tr><td>Source rights policy</td><td><select value={settings.sourceRightsPolicy ?? "approved_only"} onChange={(e) => setSettings({ ...settings, sourceRightsPolicy: e.target.value })} style={cx.input}><option value="manual">manual</option><option value="approved_only">approved_only</option><option value="licensed_only">licensed_only</option><option value="trusted_sources">trusted_sources</option></select></td></tr>
                  <tr><td>Commentary language</td><td><select value={settings.commentaryLanguage ?? "bn"} onChange={(e) => setSettings({ ...settings, commentaryLanguage: e.target.value })} style={cx.input}><option value="bn">bn</option><option value="en">en</option><option value="mixed">mixed</option></select></td></tr>
                </tbody>
              </table>
              <button style={cx.btn("primary")} onClick={() => act(() => a.put("/api/settings", settings), "Settings saved")}>Save settings</button>
              <p style={cx.tag}>Saved settings override .env for: daily target, approval mode, rights policy, commentary language. Publish times are stored for the scheduler.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const el = document.getElementById("root");
if (el) createRoot(el).render(<App />);
