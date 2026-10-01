import { Component, type ReactNode } from "react";

/**
 * If a page throws while rendering, show what happened and a way back instead
 * of a blank white window.
 */
export class CrashScreen extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          fontFamily: "Prompt, sans-serif",
          color: "#332c5e",
          background: "#fff",
        }}
      >
        <div style={{ maxWidth: 440, textAlign: "center", display: "grid", gap: 12 }}>
          <strong style={{ fontSize: 18 }}>หน้านี้แสดงผลไม่ได้</strong>
          <span style={{ fontSize: 14, color: "#6b6390" }}>
            ลองกดโหลดใหม่ ถ้ายังเป็นอยู่ แจ้งผู้ดูแลระบบพร้อมข้อความด้านล่าง
          </span>
          <code style={{ fontSize: 12, color: "#a0476b", wordBreak: "break-word" }}>{this.state.error.message}</code>
          <button
            type="button"
            onClick={() => {
              window.location.hash = "#/";
              window.location.reload();
            }}
            style={{
              justifySelf: "center",
              padding: "10px 22px",
              borderRadius: 12,
              border: 0,
              background: "#332c5e",
              color: "#fff",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            โหลดใหม่
          </button>
        </div>
      </div>
    );
  }
}
