import { useState, useEffect, useCallback } from "react";

const API = "";

// ── tiny fetch helpers ────────────────────────────────────────────────
const get  = (url)       => fetch(API + url).then(r => r.json());
const post = (url, body) => fetch(API + url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: body ? JSON.stringify(body) : undefined,
}).then(r => r.json());

// ── status colour map ─────────────────────────────────────────────────
const STATUS_COLOR = {
  SETTLED:          "#56d364",
  REJECTED:         "#f85149",
  DUPLICATE_DROPPED:"#d29922",
  INVALID:          "#f85149",
};

// ═══════════════════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

function Header({ cacheSize }) {
  return (
    <div style={{
      borderBottom: "1px solid #30363d",
      paddingBottom: 16,
      marginBottom: 24,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 8,
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, color: "#f0f6fc", letterSpacing: -0.5 }}>
          📡 UPI Offline Mesh
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#8b949e" }}>
          Send money in a basement with zero internet — encrypted mesh routing with exactly-once settlement
        </p>
      </div>
      <div style={{
        background: "#161b22",
        border: "1px solid #30363d",
        borderRadius: 6,
        padding: "6px 12px",
        fontSize: 12,
        color: "#8b949e",
        fontFamily: "monospace",
      }}>
        idempotency cache: <span style={{ color: "#58a6ff" }}>{cacheSize ?? "…"}</span>
      </div>
    </div>
  );
}

function StepBadge({ n }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: "#58a6ff", color: "#0d1117",
      borderRadius: "50%", width: 22, height: 22,
      fontSize: 12, fontWeight: 700, marginRight: 8, flexShrink: 0,
    }}>{n}</span>
  );
}

function Btn({ children, onClick, variant = "green", disabled }) {
  const bg = { green: "#238636", blue: "#1f6feb", red: "#da3633" }[variant];
  const hv = { green: "#2ea043", blue: "#388bfd", red: "#f85149" }[variant];
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? hv : bg,
        color: "#fff", border: "none",
        padding: "7px 14px", borderRadius: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 13, fontWeight: 500,
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.15s",
      }}
    >{children}</button>
  );
}

function DemoControls({ onSend, onGossip, onFlush, onReset, loading }) {
  const [sender,   setSender]   = useState("alice@demo");
  const [receiver, setReceiver] = useState("bob@demo");
  const [amount,   setAmount]   = useState(500);
  const [pin,      setPin]      = useState("1234");

  const vpas = ["alice@demo", "bob@demo", "carol@demo", "dave@demo"];

  const sel = (val, set, opts) => (
    <select value={val} onChange={e => set(e.target.value)} style={selStyle}>
      {opts.map(o => <option key={o}>{o}</option>)}
    </select>
  );

  return (
    <div style={{
      background: "#161b22", border: "1px solid #30363d",
      borderRadius: 8, padding: 16, marginBottom: 20,
    }}>
      <p style={{ margin: "0 0 14px", fontWeight: 600, fontSize: 14, color: "#f0f6fc" }}>
        🎬 Demo Flow
      </p>

      {/* Step 1 */}
      <div style={stepRow}>
        <StepBadge n={1} />
        <span style={{ fontSize: 13, color: "#c9d1d9", marginRight: 10 }}>
          <strong>Compose payment</strong>
        </span>
        {sel(sender, setSender, vpas)}
        <span style={{ color: "#8b949e", margin: "0 4px" }}>→</span>
        {sel(receiver, setReceiver, vpas.filter(v => v !== sender))}
        <span style={{ color: "#8b949e", margin: "0 4px" }}>₹</span>
        <input
          type="number" value={amount} onChange={e => setAmount(e.target.value)}
          style={{ ...inputStyle, width: 80 }}
        />
        <span style={{ color: "#8b949e", margin: "0 4px", fontSize: 13 }}>PIN</span>
        <input
          type="text" value={pin} onChange={e => setPin(e.target.value)}
          maxLength={4} style={{ ...inputStyle, width: 64 }}
        />
        <Btn onClick={() => onSend({ senderVpa: sender, receiverVpa: receiver, amount: parseFloat(amount), pin, ttl: 5, startDevice: "phone-alice" })} disabled={loading}>
          📤 Inject into Mesh
        </Btn>
      </div>

      {/* Step 2 */}
      <div style={{ ...stepRow, marginTop: 12 }}>
        <StepBadge n={2} />
        <span style={{ fontSize: 13, color: "#c9d1d9", marginRight: 10 }}>
          <strong>Gossip</strong> — packets hop device-to-device
        </span>
        <Btn variant="blue" onClick={onGossip} disabled={loading}>🔄 Run Gossip Round</Btn>
      </div>

      {/* Step 3 */}
      <div style={{ ...stepRow, marginTop: 12 }}>
        <StepBadge n={3} />
        <span style={{ fontSize: 13, color: "#c9d1d9", marginRight: 10 }}>
          <strong>Bridge node walks outside, hits 4G</strong>
        </span>
        <Btn variant="blue" onClick={onFlush} disabled={loading}>📡 Bridges Upload to Backend</Btn>
        <span style={{ fontSize: 11, color: "#8b949e", marginLeft: 8 }}>
          (parallel — exercises idempotency)
        </span>
      </div>

      {/* Reset */}
      <div style={{ marginTop: 14 }}>
        <Btn variant="red" onClick={onReset} disabled={loading}>🗑 Reset Mesh + Cache</Btn>
      </div>
    </div>
  );
}

function DeviceCard({ device }) {
  const isBridge = device.hasInternet;
  return (
    <div style={{
      border: `1px solid ${isBridge ? "#2ea043" : "#30363d"}`,
      background: isBridge ? "#052e16" : "#0d1117",
      borderRadius: 6, padding: "10px 12px", marginBottom: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <strong style={{ fontSize: 13, color: "#f0f6fc" }}>{device.deviceId}</strong>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
          background: isBridge ? "#2ea043" : "#6e7681", color: "#fff",
        }}>
          {isBridge ? "🌐 4G" : "🚫 OFFLINE"}
        </span>
        <span style={{ fontSize: 11, color: "#8b949e", marginLeft: "auto" }}>
          {device.packetCount} packet(s)
        </span>
      </div>
      <div>
        {device.packetIds.map(id => (
          <span key={id} style={{
            fontFamily: "monospace", fontSize: 10,
            background: "#21262d", padding: "2px 6px",
            borderRadius: 3, margin: 2, display: "inline-block", color: "#c9d1d9",
          }}>
            {id.substring(0, 8)}…
          </span>
        ))}
      </div>
    </div>
  );
}

function AccountsTable({ accounts }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr>
          {["VPA", "Holder", "Balance"].map(h => (
            <th key={h} style={thStyle}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {accounts.map(a => (
          <tr key={a.vpa}>
            <td style={tdStyle}>{a.vpa}</td>
            <td style={tdStyle}>{a.holderName}</td>
            <td style={{ ...tdStyle, fontFamily: "monospace", color: "#56d364", fontWeight: 600 }}>
              ₹{parseFloat(a.balance).toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LedgerTable({ transactions }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            {["ID", "From", "To", "Amount", "Status", "Bridge", "Hops", "Settled"].map(h => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ ...tdStyle, color: "#8b949e", textAlign: "center", padding: 20 }}>
                No transactions yet — run the demo flow above
              </td>
            </tr>
          ) : transactions.map(t => (
            <tr key={t.id}>
              <td style={tdStyle}>{t.id}</td>
              <td style={tdStyle}>{t.senderVpa}</td>
              <td style={tdStyle}>{t.receiverVpa}</td>
              <td style={{ ...tdStyle, fontFamily: "monospace", color: "#56d364", fontWeight: 600 }}>
                ₹{parseFloat(t.amount).toFixed(2)}
              </td>
              <td style={{ ...tdStyle, color: STATUS_COLOR[t.status] ?? "#c9d1d9", fontWeight: 600 }}>
                {t.status}
              </td>
              <td style={{ ...tdStyle, color: "#8b949e", fontSize: 11 }}>{t.bridgeNodeId}</td>
              <td style={tdStyle}>{t.hopCount}</td>
              <td style={{ ...tdStyle, color: "#8b949e", fontSize: 11 }}>
                {new Date(t.settledAt).toLocaleTimeString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivityLog({ lines }) {
  return (
    <div style={{
      background: "#010409", color: "#7ee787",
      padding: 12, borderRadius: 6,
      fontFamily: "monospace", fontSize: 12,
      maxHeight: 220, overflowY: "auto",
      whiteSpace: "pre-wrap", border: "1px solid #30363d",
    }}>
      {lines.length === 0
        ? <span style={{ color: "#3d444d" }}>// activity will appear here…</span>
        : lines.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════════════

export default function App() {
  const [devices,      setDevices]      = useState([]);
  const [accounts,     setAccounts]     = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [cacheSize,    setCacheSize]    = useState(0);
  const [log,          setLog]          = useState([]);
  const [loading,      setLoading]      = useState(false);

  const addLog = useCallback((msg) => {
    const ts = new Date().toLocaleTimeString();
    setLog(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 100));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [mesh, accs, txs] = await Promise.all([
        get("/api/mesh/state"),
        get("/api/accounts"),
        get("/api/transactions"),
      ]);
      setDevices(mesh.devices ?? []);
      setCacheSize(mesh.idempotencyCacheSize ?? 0);
      setAccounts(accs ?? []);
      setTransactions(txs ?? []);
    } catch (e) {
      addLog("⚠ Could not reach backend — is Spring Boot running on :8080?");
    }
  }, [addLog]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  const withLoad = async (fn) => {
    setLoading(true);
    try { await fn(); } finally { setLoading(false); }
  };

  const handleSend = (body) => withLoad(async () => {
    const r = await post("/api/demo/send", body);
    addLog(`📤 Packet ${r.packetId?.substring(0,8)} encrypted & injected (TTL ${r.ttl})`);
    addLog(`   ciphertext preview: ${r.ciphertextPreview}`);
    await refresh();
  });

  const handleGossip = () => withLoad(async () => {
    const r = await post("/api/mesh/gossip");
    addLog(`🔄 Gossip: ${r.transfers} transfer(s) — ${JSON.stringify(r.deviceCounts)}`);
    await refresh();
  });

  const handleFlush = () => withLoad(async () => {
    const r = await post("/api/mesh/flush");
    addLog(`📡 ${r.uploadsAttempted} bridge upload(s):`);
    (r.results ?? []).forEach(res => {
      addLog(`   ${res.bridgeNode} → ${res.outcome}${res.reason ? ` (${res.reason})` : ""}`);
    });
    await refresh();
  });

  const handleReset = () => withLoad(async () => {
    await post("/api/mesh/reset");
    addLog("🗑 mesh + idempotency cache cleared");
    await refresh();
  });

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      minHeight: "100vh",
      background: "#0d1117",
      color: "#e6edf3",
      padding: "24px 20px",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        <Header cacheSize={cacheSize} />

        <DemoControls
          onSend={handleSend}
          onGossip={handleGossip}
          onFlush={handleFlush}
          onReset={handleReset}
          loading={loading}
        />

        {/* Mesh + Accounts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div style={card}>
            <h2 style={h2}>📱 Mesh Devices</h2>
            {devices.length === 0
              ? <p style={{ color: "#8b949e", fontSize: 13 }}>Loading…</p>
              : devices.map(d => <DeviceCard key={d.deviceId} device={d} />)
            }
          </div>
          <div style={card}>
            <h2 style={h2}>🏦 Account Balances</h2>
            <AccountsTable accounts={accounts} />
          </div>
        </div>

        {/* Ledger */}
        <div style={{ ...card, marginBottom: 16 }}>
          <h2 style={h2}>📜 Transaction Ledger</h2>
          <LedgerTable transactions={transactions} />
        </div>

        {/* Log */}
        <div style={card}>
          <h2 style={h2}>🪵 Activity Log</h2>
          <ActivityLog lines={log} />
        </div>

      </div>
    </div>
  );
}

// ── shared styles ─────────────────────────────────────────────────────
const card    = { background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 16 };
const h2      = { color: "#58a6ff", borderBottom: "1px solid #30363d", paddingBottom: 4, marginTop: 0, marginBottom: 12, fontSize: 15 };
const thStyle = { textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #30363d", color: "#8b949e", fontWeight: 600, fontSize: 11, textTransform: "uppercase" };
const tdStyle = { padding: "7px 8px", borderBottom: "1px solid #21262d", fontSize: 13 };
const stepRow = { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 };
const inputStyle = { background: "#0d1117", color: "#e6edf3", border: "1px solid #30363d", borderRadius: 4, padding: "5px 8px", fontSize: 13 };
const selStyle   = { background: "#0d1117", color: "#e6edf3", border: "1px solid #30363d", borderRadius: 4, padding: "5px 8px", fontSize: 13 };
