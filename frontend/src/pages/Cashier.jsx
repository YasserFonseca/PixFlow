import React, { useState, useEffect } from "react";
import { apiFetch } from "../api.js";

export default function Cashier({ token, me, setError }) {
  // ============ ESTADOS ============
  const [display, setDisplay] = useState("0");
  const [stage, setStage] = useState("input"); // 'input' | 'qrcode' | 'success'
  const [qrCode, setQrCode] = useState(null);
  const [chargeId, setChargeId] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [paymentValue, setPaymentValue] = useState("0");
  const [pressedBtn, setPressedBtn] = useState(null); // Para feedback visual

  // ============ TECLADO NUMÉRICO ============
  function handleNum(num) {
    setPressedBtn(num);
    setTimeout(() => setPressedBtn(null), 100);

    if (display === "0") {
      setDisplay(num);
    } else if (display.length < 15) {
      setDisplay(display + num);
    }
  }

  function handleClear() {
    setPressedBtn("C");
    setTimeout(() => setPressedBtn(null), 100);
    setDisplay("0");
  }

  function handleBackspace() {
    setPressedBtn("⌫");
    setTimeout(() => setPressedBtn(null), 100);
    const newDisplay = display.slice(0, -1) || "0";
    setDisplay(newDisplay);
  }

  // ============ SUPORTE A TECLADO FÍSICO ============
  useEffect(() => {
    if (stage !== "input") return;

    function handleKeyDown(e) {
      if (e.key >= "0" && e.key <= "9") {
        handleNum(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Delete" || e.key === "c" || e.key === "C") {
        e.preventDefault();
        handleClear();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stage, display]);

  // ============ FORMATAÇÃO DE VALOR ============
  function getDisplayValue() {
    // Remove tudo que não é número
    const clean = display.replace(/\D/g, "");
    if (!clean) return "0,00";

    // Converte para número e formata
    const num = parseInt(clean, 10);
    return (num / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // ============ GERAR PIX ============
  async function handleGeneratePix() {
    try {
      setError("");
      const clean = display.replace(/\D/g, "");
      const value = parseInt(clean, 10) / 100;

      if (value <= 0) {
        setError("Valor deve ser maior que R$ 0,00");
        return;
      }

      // Chama API para criar cobrança
      const response = await apiFetch("/charges", {
        token,
        method: "POST",
        body: {
          client: `Cliente - ${Date.now()}`,
          value: value.toFixed(2),
          message: `Cobrança PIX de R$ ${value.toFixed(2)}`,
        },
      });

      setChargeId(response.id);
      setPaymentValue(value.toFixed(2));
      setQrCode("generating...");
      setStage("qrcode");

      // Inicia polling
      startPolling(response.id);
    } catch (err) {
      setError(err.message || "Erro ao processar cobrança");
    }
  }

  // ============ POLLING DE STATUS ============
  function startPolling(cId) {
    const interval = setInterval(async () => {
      try {
        const charges = await apiFetch("/charges", { token });
        const charge = charges.find((c) => c.id === cId);

        // Procura por 'approved' ou 'paid' (integração Mercado Pago)
        if (charge && (charge.status === "approved" || charge.status === "paid")) {
          clearInterval(interval);
          setStage("success");
          playSuccessSound(paymentValue);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);

    setPollingInterval(interval);
  }

  // ============ FEEDBACK SONORO ============
  function playSuccessSound(value) {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(
      `Pagamento de ${value} reais confirmado`
    );
    utterance.lang = "pt-BR";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    synth.speak(utterance);
  }

  // ============ NOVA COBRANÇA ============
  function handleNewCharge() {
    if (pollingInterval) clearInterval(pollingInterval);
    setDisplay("0");
    setStage("input");
    setQrCode(null);
    setChargeId(null);
    setPaymentValue("0");
  }

  // ============ COPIAR PIX ============
  function handleCopyPix() {
    // TODO: Integração real com Mercado Pago
    navigator.clipboard.writeText("00020126580014br.gov.bcb.pixel...");
    setError("PIX copiado para a área de transferência!");
  }

  // ============ CLEANUP ============
  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  // ============ RENDER: INPUT ============
  if (stage === "input") {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>💳 Máquina de Cobrar</h1>
          <p style={styles.subtitle}>{me?.name || "Lojista"}</p>
        </div>

        <div style={styles.displayBox}>
          <div style={styles.displayLabel}>Valor a Cobrar</div>
          <div style={styles.displayValue}>R$ {getDisplayValue()}</div>
        </div>

        <div style={styles.keyboard}>
          {/* Linha 1 */}
          <button
            style={{ ...styles.btn, ...(pressedBtn === "1" ? styles.btnActive : {}) }}
            onClick={() => handleNum("1")}
          >
            1
          </button>
          <button
            style={{ ...styles.btn, ...(pressedBtn === "2" ? styles.btnActive : {}) }}
            onClick={() => handleNum("2")}
          >
            2
          </button>
          <button
            style={{ ...styles.btn, ...(pressedBtn === "3" ? styles.btnActive : {}) }}
            onClick={() => handleNum("3")}
          >
            3
          </button>

          {/* Linha 2 */}
          <button
            style={{ ...styles.btn, ...(pressedBtn === "4" ? styles.btnActive : {}) }}
            onClick={() => handleNum("4")}
          >
            4
          </button>
          <button
            style={{ ...styles.btn, ...(pressedBtn === "5" ? styles.btnActive : {}) }}
            onClick={() => handleNum("5")}
          >
            5
          </button>
          <button
            style={{ ...styles.btn, ...(pressedBtn === "6" ? styles.btnActive : {}) }}
            onClick={() => handleNum("6")}
          >
            6
          </button>

          {/* Linha 3 */}
          <button
            style={{ ...styles.btn, ...(pressedBtn === "7" ? styles.btnActive : {}) }}
            onClick={() => handleNum("7")}
          >
            7
          </button>
          <button
            style={{ ...styles.btn, ...(pressedBtn === "8" ? styles.btnActive : {}) }}
            onClick={() => handleNum("8")}
          >
            8
          </button>
          <button
            style={{ ...styles.btn, ...(pressedBtn === "9" ? styles.btnActive : {}) }}
            onClick={() => handleNum("9")}
          >
            9
          </button>

          {/* Linha 4 */}
          <button
            style={{ ...styles.btn, ...(pressedBtn === "00" ? styles.btnActive : {}) }}
            onClick={() => handleNum("00")}
          >
            00
          </button>
          <button
            style={{ ...styles.btn, ...(pressedBtn === "0" ? styles.btnActive : {}) }}
            onClick={() => handleNum("0")}
          >
            0
          </button>
          <button
            style={{
              ...styles.btn,
              ...styles.btnDanger,
              ...(pressedBtn === "⌫" ? styles.btnActive : {}),
            }}
            onClick={handleBackspace}
          >
            ⌫
          </button>

          {/* Linha 5: Limpar */}
          <button
            style={{
              ...styles.btnWide,
              ...styles.btnClear,
              ...(pressedBtn === "C" ? styles.btnActive : {}),
            }}
            onClick={handleClear}
          >
            LIMPAR
          </button>

          {/* Linha 6: Gerar PIX */}
          <button
            style={styles.btnWide}
            onClick={handleGeneratePix}
          >
            🎯 GERAR PIX
          </button>
        </div>
      </div>
    );
  }

  // ============ RENDER: QRCODE ============
  if (stage === "qrcode") {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>📱 Escaneie o QR Code</h1>
          <p style={styles.subtitle}>Valor: R$ {paymentValue}</p>
        </div>

        <div style={styles.qrcodeBox}>
          <div style={styles.qrcodePlaceholder}>
            📲
            <br />
            <span>QR Code Dinâmico</span>
          </div>
        </div>

        <div style={styles.actionGrid}>
          <button style={styles.btnWide} onClick={handleCopyPix}>
            📋 COPIAR CÓDIGO
          </button>
          <button
            style={{ ...styles.btnWide, ...styles.btnClear }}
            onClick={handleNewCharge}
          >
            ✕ CANCELAR
          </button>
        </div>

        <div style={styles.status}>
          <span style={{ animation: "spin 1.5s linear infinite" }}>⏳</span>
          &nbsp; Aguardando pagamento...
        </div>
      </div>
    );
  }

  // ============ RENDER: SUCESSO ============
  if (stage === "success") {
    return (
      <div style={styles.successScreen}>
        <div style={styles.successContent}>
          <div style={styles.checkmark}>✅</div>
          <h1 style={styles.successTitle}>Pago!</h1>
          <p style={styles.successValue}>R$ {paymentValue}</p>
        </div>

        <button style={styles.btnWide} onClick={handleNewCharge}>
          🔄 PRÓXIMA COBRANÇA
        </button>
      </div>
    );
  }
}

// ============ ESTILOS ============
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minHeight: "100%",
    overflow: "auto",
  },

  header: {
    textAlign: "center",
    marginBottom: "8px",
  },

  title: {
    fontSize: "32px",
    fontWeight: "800",
    margin: "0",
    color: "var(--accent)",
  },

  subtitle: {
    fontSize: "14px",
    color: "var(--muted)",
    margin: "4px 0 0 0",
  },

  displayBox: {
    backgroundColor: "var(--card)",
    borderRadius: "12px",
    padding: "20px",
    textAlign: "center",
    border: "2px solid var(--line)",
  },

  displayLabel: {
    fontSize: "12px",
    color: "var(--muted)",
    textTransform: "uppercase",
    marginBottom: "8px",
    letterSpacing: "1px",
  },

  displayValue: {
    fontSize: "56px",
    fontWeight: "800",
    color: "var(--accent)",
    margin: "0",
    letterSpacing: "-2px",
  },

  keyboard: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "10px",
    marginBottom: "12px",
  },

  btn: {
    padding: "18px 12px",
    fontSize: "22px",
    fontWeight: "700",
    backgroundColor: "var(--card)",
    color: "var(--text)",
    border: "2px solid var(--line)",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.15s",
    minHeight: "70px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  btnActive: {
    backgroundColor: "var(--accent)",
    color: "var(--bg)",
    borderColor: "var(--accent)",
    transform: "scale(0.95)",
  },

  btnDanger: {
    backgroundColor: "var(--red)",
    borderColor: "var(--red)",
    color: "white",
  },

  btnWide: {
    gridColumn: "1 / -1",
    padding: "20px",
    fontSize: "18px",
    fontWeight: "800",
    backgroundColor: "var(--accent)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.2s",
    minHeight: "60px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  btnClear: {
    backgroundColor: "var(--card)",
    color: "var(--text)",
    border: "2px solid var(--line)",
  },

  qrcodeBox: {
    flex: "1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "16px",
  },

  qrcodePlaceholder: {
    width: "280px",
    height: "280px",
    backgroundColor: "var(--card)",
    border: "2px solid var(--line)",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "64px",
    color: "var(--muted)",
    gap: "12px",
    textAlign: "center",
  },

  actionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginBottom: "12px",
  },

  status: {
    textAlign: "center",
    color: "var(--muted)",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px",
  },

  // SUCCESS SCREEN
  successScreen: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "var(--green)",
    color: "white",
    gap: "32px",
    padding: "20px",
  },

  successContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    flex: "1",
    justifyContent: "center",
  },

  checkmark: {
    fontSize: "120px",
    marginBottom: "16px",
    animation: "bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) 1",
  },

  successTitle: {
    fontSize: "48px",
    fontWeight: "800",
    margin: "0 0 8px 0",
  },

  successValue: {
    fontSize: "56px",
    fontWeight: "800",
    margin: "12px 0",
    letterSpacing: "-1px",
  },
};
