// components/Shared/index.jsx — Design System كامل لـ Orbit

import { useState } from "react";

// ─── Design Tokens ────────────────────────────────────────────
export const T = {
  bg: "#0a192f",
  bgCard: "rgba(16,38,68,0.9)",
  bgGlass: "rgba(255,255,255,0.04)",
  cyan: "#00f5ff",
  cyanDim: "rgba(0,245,255,0.12)",
  cyanGlow: "0 0 20px rgba(0,245,255,0.45)",
  purple: "#7b2fff",
  purpleDim: "rgba(123,47,255,0.15)",
  pink: "#ff2d78",
  green: "#00ff88",
  textPrimary: "#e8f4fd",
  textMuted: "#8892a4",
  border: "rgba(0,245,255,0.15)",
  borderMuted: "rgba(255,255,255,0.07)",
  radius: 14,
  font: "'Cairo', 'Segoe UI', sans-serif",
};

// ─── Input ────────────────────────────────────────────────────
export function Input({ value, onChange, placeholder, type = "text", style = {}, ...rest }) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      style={{
        width: "100%",
        padding: "12px 16px",
        borderRadius: T.radius,
        border: `1px solid ${T.border}`,
        background: T.bgGlass,
        color: T.textPrimary,
        fontSize: 15,
        fontFamily: T.font,
        outline: "none",
        boxSizing: "border-box",
        transition: "border-color 0.2s, box-shadow 0.2s",
        ...style,
      }}
      onFocus={(e) => {
        e.target.style.borderColor = T.cyan;
        e.target.style.boxShadow = T.cyanGlow;
      }}
      onBlur={(e) => {
        e.target.style.borderColor = T.border;
        e.target.style.boxShadow = "none";
      }}
      {...rest}
    />
  );
}

// ─── Button ───────────────────────────────────────────────────
const btnVariants = {
  cyan:   { bg: T.cyan,   color: T.bg,  glow: T.cyanGlow },
  purple: { bg: T.purple, color: "#fff", glow: "0 0 20px rgba(123,47,255,0.5)" },
  danger: { bg: T.pink,   color: "#fff", glow: "0 0 20px rgba(255,45,120,0.5)" },
  green:  { bg: T.green,  color: T.bg,  glow: "0 0 20px rgba(0,255,136,0.5)" },
  ghost:  { bg: "transparent", color: T.cyan, glow: "none", border: `1px solid ${T.cyan}` },
  dark:   { bg: T.bgCard, color: T.textPrimary, glow: "none", border: `1px solid ${T.border}` },
};

export function Button({ children, onClick, variant = "cyan", disabled, full, style = {}, size = "md" }) {
  const v = btnVariants[variant];
  const sizes = { sm: "8px 14px", md: "11px 22px", lg: "14px 28px" };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: v.bg,
        color: v.color,
        border: v.border || "none",
        borderRadius: T.radius,
        padding: sizes[size],
        fontWeight: 700,
        fontSize: size === "sm" ? 12 : 14,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : v.glow,
        opacity: disabled ? 0.45 : 1,
        transition: "all 0.2s",
        fontFamily: T.font,
        width: full ? "100%" : "auto",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ─── GlassCard ────────────────────────────────────────────────
export function GlassCard({ children, style = {}, onClick, glow }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        padding: 16,
        boxShadow: glow ? T.cyanGlow : "0 4px 24px rgba(0,0,0,0.3)",
        transition: "all 0.2s",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────
export function Avatar({ src, name, size = 44, online, verified }) {
  return (
    <div style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${T.purple}, ${T.cyan})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.38,
          fontWeight: 800,
          color: "#fff",
          border: online ? `2px solid ${T.cyan}` : `2px solid ${T.borderMuted}`,
          boxShadow: online ? T.cyanGlow : "none",
          overflow: "hidden",
        }}
      >
        {src
          ? <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : (name?.[0] || "O").toUpperCase()
        }
      </div>
      {online && (
        <span style={{
          position: "absolute", bottom: 1, right: 1,
          width: size * 0.22, height: size * 0.22,
          borderRadius: "50%", background: T.green,
          border: `2px solid ${T.bg}`,
        }} />
      )}
      {verified && (
        <span style={{
          position: "absolute", top: -2, right: -4,
          width: 16, height: 16, borderRadius: "50%",
          background: T.cyan, boxShadow: T.cyanGlow,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, color: T.bg, fontWeight: 900,
        }}>✓</span>
      )}
    </div>
  );
}

// ─── Badge (Verified) ─────────────────────────────────────────
export function VerifiedBadge({ size = 16 }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: size, height: size, borderRadius: "50%",
      background: T.cyan, boxShadow: T.cyanGlow,
      fontSize: size * 0.6, color: T.bg, fontWeight: 900,
      marginRight: 4, flexShrink: 0,
    }}>✓</span>
  );
}

// ─── Error Message ────────────────────────────────────────────
export function ErrorMsg({ text }) {
  if (!text) return null;
  return (
    <div style={{
      background: "rgba(255,45,120,0.1)",
      border: `1px solid rgba(255,45,120,0.3)`,
      borderRadius: 10, padding: "10px 14px",
      color: T.pink, fontSize: 13,
    }}>⚠️ {text}</div>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────
export function Spinner({ size = 32 }) {
  return (
    <div style={{
      width: size, height: size,
      border: `3px solid ${T.cyanDim}`,
      borderTop: `3px solid ${T.cyan}`,
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    }} />
  );
}

// ─── NeonDivider ──────────────────────────────────────────────
export function NeonDivider() {
  return (
    <div style={{
      height: 1,
      background: `linear-gradient(90deg, transparent, ${T.cyan}, transparent)`,
      margin: "8px 0",
      opacity: 0.4,
    }} />
  );
}

// ─── Global CSS (inject once) ─────────────────────────────────
export const GlobalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: #0a192f; direction: rtl; font-family: 'Cairo', 'Segoe UI', sans-serif; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(0,245,255,0.25); border-radius: 4px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%,100% { transform:scale(1); opacity:.6; } 50% { transform:scale(1.3); opacity:1; } }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes glow { 0%,100% { box-shadow: 0 0 10px rgba(0,245,255,0.3); } 50% { box-shadow: 0 0 30px rgba(0,245,255,0.7); } }
  .orbit-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,245,255,0.15) !important; }
  input::placeholder, textarea::placeholder { color: #8892a4; }
  textarea { resize: vertical; }
`;
