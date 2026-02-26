import React, { useState, useEffect, useRef } from "react";

interface CompileIndicatorProps {
  isCompiling: boolean;
  errors: string[];
  success: boolean;
}

const CompileIndicator: React.FC<CompileIndicatorProps> = ({
  isCompiling,
  errors,
  success,
}) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (success && !isCompiling && errors.length === 0) {
      setShowSuccess(true);

      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }

      successTimeoutRef.current = setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    }

    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, [success, isCompiling, errors]);

  if (isCompiling) {
    return (
      <div style={containerStyle}>
        <div style={pulsingDotStyle} />
        <span style={labelStyle}>Compiling...</span>
      </div>
    );
  }

  if (errors.length > 0) {
    return (
      <div style={containerStyle}>
        <div style={{ ...dotStyle, background: "var(--error)" }} />
        <span style={{ ...labelStyle, color: "var(--error)" }}>
          {errors.length} error{errors.length !== 1 ? "s" : ""}
        </span>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div style={{ ...containerStyle, opacity: 1, transition: "opacity 0.5s ease" }}>
        <div style={{ ...dotStyle, background: "var(--success)" }} />
      </div>
    );
  }

  return null;
};

const containerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  height: "100%",
};

const dotStyle: React.CSSProperties = {
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  flexShrink: 0,
};

const pulsingDotStyle: React.CSSProperties = {
  ...dotStyle,
  background: "var(--warning)",
  animation: "pulse 1.2s ease-in-out infinite",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "11px",
  color: "var(--text-muted)",
  lineHeight: 1,
};

// Inject the pulse keyframe animation
const styleId = "euler-compile-indicator-styles";
if (typeof document !== "undefined" && !document.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

export default CompileIndicator;
