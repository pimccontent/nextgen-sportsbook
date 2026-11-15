"use client";

export default function CustomerGlobalError({
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
          background: "linear-gradient(165deg, #0a0a0a 0%, #171717 45%, #1c1917 100%)",
          color: "#fafafa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <p
            style={{
              fontFamily: "Sora, Segoe UI, sans-serif",
              letterSpacing: "0.2em",
              fontSize: 11,
              fontWeight: 700,
              color: "#F5A524",
              textTransform: "uppercase",
            }}
          >
            Critical error
          </p>
          <h1
            style={{
              fontFamily: "Sora, Segoe UI, sans-serif",
              fontSize: 28,
              fontWeight: 800,
              margin: "12px 0",
            }}
          >
            App failed to load
          </h1>
          <p style={{ color: "#a3a3a3", fontSize: 14, lineHeight: 1.55 }}>
            A serious client error occurred. Please reload. If it continues, contact support.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 28,
              border: "none",
              borderRadius: 12,
              background: "#F5A524",
              color: "#111",
              fontWeight: 700,
              fontSize: 14,
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
          {error.digest ? (
            <p style={{ marginTop: 20, fontSize: 10, color: "#737373", fontFamily: "monospace" }}>
              {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
