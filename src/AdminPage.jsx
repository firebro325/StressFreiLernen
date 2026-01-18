import React, { useEffect, useMemo, useState } from "react";
import { adminDelete, adminList, adminLogin } from "./adminApi";

const TOKEN_KEY = "swim_admin_token";

export default function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [sortDir, setSortDir] = useState("asc"); // asc | desc

  const isLoggedIn = !!token;

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await adminList({ token, query, sortDir });
      if (!data.ok) throw new Error(data.error || "Failed to load");
      setRows(data.rows || []);
    } catch (e) {
      const msg = String(e.message || e);
      setError(msg);
      // Token abgelaufen / ungültig
      if (msg.toLowerCase().includes("unauthorized")) onLogout();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isLoggedIn) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, sortDir]);

  const displayed = useMemo(() => rows, [rows]);

  async function onLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await adminLogin(username, password);
      if (!data.ok) throw new Error(data.error || "Login failed");
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setPassword("");
    } catch (e2) {
      setError(String(e2.message || e2));
    } finally {
      setLoading(false);
    }
  }

  function onLogout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setRows([]);
  }

  async function onSearch(e) {
    e.preventDefault();
    if (!isLoggedIn) return;
    await load();
  }

  async function onDelete(row) {
    const ok = window.confirm(
      `Buchung wirklich löschen?\n\n${row.firstName} ${row.lastName}\n${row.course}\n${row.date} ${row.time}`
    );
    if (!ok) return;

    setLoading(true);
    setError("");
    try {
      const data = await adminDelete({ token, id: row.id });
      if (!data.ok) throw new Error(data.error || "Delete failed");
      await load();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <div style={{ maxWidth: 420, margin: "40px auto", padding: 16, fontFamily: "system-ui, Arial" }}>
        <h2>Admin Login</h2>

        <form onSubmit={onLogin}>
          <div style={{ marginBottom: 12 }}>
            <label>Benutzer</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
              autoComplete="username"
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
              autoComplete="current-password"
            />
          </div>

          {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}

          <button disabled={loading || !password} style={{ padding: "10px 14px" }}>
            {loading ? "…" : "Einloggen"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: 16, fontFamily: "system-ui, Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h2>Admin – Buchungen</h2>
        <button onClick={onLogout} style={{ padding: "8px 12px" }}>
          Logout
        </button>
      </div>

      <form onSubmit={onSearch} style={{ display: "flex", gap: 10, margin: "12px 0 18px" }}>
        <input
          placeholder="Suche nach Name (Vor- oder Nachname)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, padding: 10 }}
        />
        <button disabled={loading} style={{ padding: "10px 14px" }}>
          Suchen
        </button>

        <button
          type="button"
          onClick={() => setSortDir((s) => (s === "asc" ? "desc" : "asc"))}
          style={{ padding: "10px 14px" }}
          disabled={loading}
          title="Sortierung Datum/Uhrzeit umschalten"
        >
          Sort: {sortDir === "asc" ? "↑" : "↓"}
        </button>
      </form>

      {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}
      {loading && <div style={{ marginBottom: 12 }}>Lädt…</div>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Datum</Th>
              <Th>Uhrzeit</Th>
              <Th>Kurs</Th>
              <Th>Name</Th>
              <Th>Timestamp</Th>
              <Th>Aktion</Th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #ddd" }}>
                <Td>{r.date}</Td>
                <Td>{r.time}</Td>
                <Td>{r.course}</Td>
                <Td>{r.firstName} {r.lastName}</Td>
                <Td style={{ opacity: 0.75 }}>{r.timestamp}</Td>
                <Td>
                  <button onClick={() => onDelete(r)} disabled={loading} style={{ padding: "6px 10px" }}>
                    Löschen
                  </button>
                </Td>
              </tr>
            ))}

            {!loading && displayed.length === 0 && (
              <tr>
                <Td colSpan={6} style={{ padding: 14, opacity: 0.7 }}>
                  Keine Buchungen gefunden.
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }) {
  return <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "2px solid #ddd" }}>{children}</th>;
}
function Td({ children, ...rest }) {
  return <td style={{ padding: "10px 8px" }} {...rest}>{children}</td>;
}
