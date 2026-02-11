import React, { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import { Toast } from "../ui.jsx";

export default function Dashboard({ me, token, setError, setMe }) {
  const [activeTab, setActiveTab] = useState("stats"); // 'stats' | 'settings'
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pix, setPix] = useState(me?.pix || "");
  const [toast, setToast] = useState("");

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadStats() {
    try {
      setError("");
      const data = await apiFetch("/dashboard/stats", { token });
      setStats(data);
    } catch (err) {
      setError(err.message || "Erro ao carregar estatísticas");
    } finally {
      setLoading(false);
    }
  }

  async function savePix() {
    setToast("");
    setError("");
    try {
      await apiFetch("/pix", { token, method: "POST", body: { pix } });
      const fresh = await apiFetch("/me", { token });
      setMe(fresh);
      setToast("✅ Chave Pix salva!");
    } catch (e) {
      setError(e.message);
      setToast("❌ Erro: " + e.message);
    }
  }

  return (
    <div style={styles.container}>
      {/* ============ TABS ============ */}
      <div style={styles.tabsBar}>
        <button
          style={{
            ...styles.tabBtn,
            ...(activeTab === "stats" ? styles.tabBtnActive : {}),
          }}
          onClick={() => setActiveTab("stats")}
        >
          📊 Vendas
        </button>
        <button
          style={{
            ...styles.tabBtn,
            ...(activeTab === "settings" ? styles.tabBtnActive : {}),
          }}
          onClick={() => setActiveTab("settings")}
        >
          ⚙️ Configurações
        </button>
      </div>

      {/* ============ TAB: STATS ============ */}
      {activeTab === "stats" && (
        <div>
          {loading ? (
            <div style={styles.loadingBox}>
              <div style={styles.spinner}>⏳</div>
              <p>Carregando dashboard...</p>
            </div>
          ) : stats ? (
            <StatsView stats={stats} onRefresh={loadStats} />
          ) : (
            <div style={styles.errorBox}>Erro ao carregar dados</div>
          )}
        </div>
      )}

      {/* ============ TAB: SETTINGS ============ */}
      {activeTab === "settings" && (
        <div style={styles.settingsPanel}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>👤 Minha Conta</h2>
            <p style={styles.email}>{me?.email}</p>

            <label style={styles.label}>Chave Pix</label>
            <input
              style={styles.input}
              value={pix}
              onChange={(e) => setPix(e.target.value)}
              placeholder="CPF, CNPJ, email ou telefone..."
            />

            <button style={styles.saveBtnGreen} onClick={savePix}>
              ✅ Salvar Chave Pix
            </button>

            <Toast>{toast}</Toast>
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>🔗 Atalhos</h2>
            <div style={styles.buttonGroup}>
              <a
                style={styles.linkBtn}
                href="http://localhost:5000/api/export/charges.csv"
                target="_blank"
                rel="noreferrer"
              >
                📥 Baixar CSV
              </a>
              <button
                style={styles.linkBtn}
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({}, "", "/charges");
                  window.dispatchEvent(new Event("popstate"));
                }}
              >
                📝 Todas as Cobranças
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ COMPONENTE: VIEW DE STATS ============
function StatsView({ stats, onRefresh }) {
  const today = stats.today;

  return (
    <div style={styles.statsView}>
      {/* HEADER */}
      <div style={styles.headerStats}>
        <h1 style={styles.titleStats}>📊 Dashboard de Vendas</h1>
        <button style={styles.refreshBtn} onClick={onRefresh}>
          🔄 Atualizar
        </button>
      </div>

      {/* CARDS */}
      <div style={styles.cardsGrid}>
        <Card
          icon="💰"
          label="Vendido Hoje"
          value={`R$ ${today.revenue.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })}`}
          meta={`${today.revenue_growth_percent >= 0 ? "📈" : "📉"} ${today.revenue_growth_percent}% vs ontem`}
          metaColor={today.revenue_growth_percent >= 0 ? "var(--green)" : "var(--red)"}
        />

        <Card
          icon="📦"
          label="Vendas Hoje"
          value={today.sales_count}
          meta={`${today.sales_growth_percent >= 0 ? "📈" : "📉"} ${today.sales_growth_percent}% vs ontem`}
          metaColor={today.sales_growth_percent >= 0 ? "var(--green)" : "var(--red)"}
        />

        <Card
          icon="🎫"
          label="Ticket Médio (7d)"
          value={`R$ ${stats.average_ticket.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })}`}
          meta={`${stats.count_7days} vendas`}
        />

        <Card
          icon="🏆"
          label="Faturamento (7d)"
          value={`R$ ${stats.total_7days.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })}`}
          meta={`Média: R$ ${(stats.total_7days / 7).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })}/dia`}
        />
      </div>

      {/* GRÁFICO */}
      <div style={styles.chartBox}>
        <h2 style={styles.chartTitle}>Vendas por Dia (Últimos 7 dias)</h2>
        <BarChart data={stats.revenue_by_day} />
      </div>

      {/* TABELA */}
      <div style={styles.tableBox}>
        <h2 style={styles.tableTitle}>Detalhamento Diário</h2>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeaderRow}>
              <th style={styles.tableHeader}>Data</th>
              <th style={styles.tableHeader}>Dia</th>
              <th style={styles.tableHeader}>Faturamento</th>
            </tr>
          </thead>
          <tbody>
            {stats.revenue_by_day.map((day, idx) => (
              <tr key={idx} style={styles.tableRow}>
                <td style={styles.tableCell}>{day.date}</td>
                <td style={styles.tableCell}>{day.day_name}</td>
                <td
                  style={{
                    ...styles.tableCell,
                    fontWeight: "700",
                    color: "var(--green)",
                  }}
                >
                  R$ {day.revenue.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============ COMPONENTE: CARD ============
function Card({ icon, label, value, meta, metaColor }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardIcon}>{icon}</div>
      <div style={styles.cardLabel}>{label}</div>
      <div style={styles.cardValue}>{value}</div>
      <div style={{ ...styles.cardMeta, color: metaColor || "var(--muted)" }}>
        {meta}
      </div>
    </div>
  );
}

// ============ COMPONENTE: GRÁFICO DE BARRAS ============
function BarChart({ data }) {
  if (!data || data.length === 0) {
    return <div style={styles.emptyChart}>Sem dados para exibir</div>;
  }

  const maxValue = Math.max(...data.map((d) => d.revenue), 1);
  const scale = 100 / maxValue;

  return (
    <div style={styles.barChartWrapper}>
      <div style={styles.barsContainer}>
        {data.map((day, idx) => (
          <div key={idx} style={styles.barItem}>
            <div style={styles.barLabelTop}>
              R$ {day.revenue.toLocaleString("pt-BR", {
                minimumFractionDigits: 0,
              })}
            </div>
            <div
              style={{
                ...styles.bar,
                height: `${Math.max(day.revenue * scale, 10)}px`,
                backgroundColor: day.revenue > 0 ? "var(--accent)" : "var(--line)",
              }}
            />
            <div style={styles.barLabel}>{day.day_name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ ESTILOS ============
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "0",
    padding: "0",
    minHeight: "100vh",
    backgroundColor: "var(--bg)",
    color: "var(--text)",
  },

  tabsBar: {
    display: "flex",
    gap: "0",
    borderBottom: "2px solid var(--line)",
    backgroundColor: "var(--card)",
    padding: "0 20px",
  },

  tabBtn: {
    padding: "16px 20px",
    fontSize: "14px",
    fontWeight: "700",
    backgroundColor: "transparent",
    color: "var(--muted)",
    border: "none",
    borderBottom: "3px solid transparent",
    cursor: "pointer",
    transition: "all 0.2s",
  },

  tabBtnActive: {
    color: "var(--accent)",
    borderBottomColor: "var(--accent)",
  },

  statsView: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },

  headerStats: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  titleStats: {
    fontSize: "32px",
    fontWeight: "800",
    margin: "0",
    color: "var(--accent)",
  },

  refreshBtn: {
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: "700",
    backgroundColor: "var(--accent)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
  },

  loadingBox: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "400px",
    gap: "16px",
  },

  spinner: {
    fontSize: "48px",
    animation: "spin 1.5s linear infinite",
  },

  errorBox: {
    padding: "20px",
    backgroundColor: "var(--red)",
    color: "white",
    borderRadius: "8px",
    textAlign: "center",
    margin: "20px",
  },

  // Cards
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "16px",
  },

  card: {
    backgroundColor: "var(--card)",
    border: "2px solid var(--line)",
    borderRadius: "12px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  cardIcon: {
    fontSize: "32px",
  },

  cardLabel: {
    fontSize: "13px",
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: "1px",
    fontWeight: "600",
  },

  cardValue: {
    fontSize: "28px",
    fontWeight: "800",
    color: "var(--accent)",
  },

  cardMeta: {
    fontSize: "12px",
    marginTop: "4px",
  },

  cardTitle: {
    fontSize: "18px",
    fontWeight: "700",
    margin: "0 0 12px 0",
  },

  // Chart
  chartBox: {
    backgroundColor: "var(--card)",
    border: "2px solid var(--line)",
    borderRadius: "12px",
    padding: "20px",
  },

  chartTitle: {
    fontSize: "18px",
    fontWeight: "700",
    margin: "0 0 16px 0",
  },

  barChartWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  barsContainer: {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: "280px",
    gap: "12px",
    padding: "16px 0",
    borderBottom: "2px solid var(--line)",
  },

  barItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    flex: "1",
  },

  barLabelTop: {
    fontSize: "12px",
    fontWeight: "700",
    color: "var(--accent)",
    minHeight: "16px",
  },

  bar: {
    width: "100%",
    minHeight: "10px",
    borderRadius: "4px 4px 0 0",
    transition: "all 0.3s",
  },

  barLabel: {
    fontSize: "11px",
    color: "var(--muted)",
    fontWeight: "600",
  },

  emptyChart: {
    padding: "40px",
    textAlign: "center",
    color: "var(--muted)",
  },

  // Table
  tableBox: {
    backgroundColor: "var(--card)",
    border: "2px solid var(--line)",
    borderRadius: "12px",
    padding: "20px",
    overflowX: "auto",
  },

  tableTitle: {
    fontSize: "18px",
    fontWeight: "700",
    margin: "0 0 16px 0",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  tableHeaderRow: {
    borderBottom: "2px solid var(--line)",
  },

  tableHeader: {
    padding: "12px",
    textAlign: "left",
    fontSize: "13px",
    fontWeight: "700",
    color: "var(--muted)",
    textTransform: "uppercase",
  },

  tableRow: {
    borderBottom: "1px solid var(--line)",
  },

  tableCell: {
    padding: "12px",
    fontSize: "14px",
  },

  // Settings
  settingsPanel: {
    padding: "20px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "20px",
  },

  email: {
    fontSize: "14px",
    color: "var(--muted)",
    margin: "0 0 16px 0",
  },

  label: {
    fontSize: "12px",
    color: "var(--muted)",
    textTransform: "uppercase",
    fontWeight: "600",
    display: "block",
    marginBottom: "8px",
    letterSpacing: "0.5px",
  },

  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    backgroundColor: "var(--bg)",
    border: "2px solid var(--line)",
    borderRadius: "8px",
    color: "var(--text)",
    marginBottom: "12px",
    boxSizing: "border-box",
  },

  saveBtnGreen: {
    width: "100%",
    padding: "12px",
    fontSize: "14px",
    fontWeight: "700",
    backgroundColor: "var(--green)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
  },

  buttonGroup: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },

  linkBtn: {
    padding: "12px",
    fontSize: "14px",
    fontWeight: "700",
    backgroundColor: "var(--accent)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    textDecoration: "none",
    textAlign: "center",
    transition: "all 0.2s",
  },
};
