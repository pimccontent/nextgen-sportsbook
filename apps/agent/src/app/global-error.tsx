"use client";

export default function AgentGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily: "Manrope, Segoe UI, sans-serif",
          background: "linear-gradient(160deg, #09090b 0%, #18181b 50%, #1c1917 100%)",
          color: "#fafafa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 400, textAlign: "center" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#F5A524",
            }}
          >
            Agent portal
          </p>
          <h1 style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 800 }}>
            Critical error
          </h1>
          <p style={{ color: "#a3a3a3", fontSize: 14, lineHeight: 1.5 }}>
            The agent app failed to start. Reload to continue.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 24,
              background: "#F5A524",
              color: "#111",
              border: "none",
              borderRadius: 12,
              padding: "10px 18px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
          {error.digest ? (
            <p style={{ marginTop: 16, fontSize: 10, color: "#737373" }}>{error.digest}</p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
