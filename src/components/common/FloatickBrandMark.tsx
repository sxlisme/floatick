import React from "react";

interface FloatickBrandMarkProps {
  size?: number;
  glyphOnly?: boolean;
  className?: string;
}

export const FloatickBrandMark: React.FC<FloatickBrandMarkProps> = ({
  size = 38,
  glyphOnly = false,
  className = "",
}) => {
  const borderRadius = Math.round(size * 0.31);
  const strokeWidth = size * 0.055;

  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={glyphOnly ? className : "absolute inset-0"}
    >
      <rect
        x="21"
        y="22"
        width="58"
        height="56"
        rx="14"
        stroke="#1DB3A8"
        strokeWidth={strokeWidth * 1.35}
        opacity="0.46"
      />
      <path
        d="M34 39 L39 44 L48 34"
        stroke="#2CCCBD"
        strokeWidth={strokeWidth * 2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M55 39 H69"
        stroke="#2CCCBD"
        strokeWidth={strokeWidth * 1.8}
        strokeLinecap="round"
      />
      <path
        d="M34 60 L39 65 L48 55"
        stroke="#2CCCBD"
        strokeWidth={strokeWidth * 2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M55 60 H69"
        stroke="#2CCCBD"
        strokeWidth={strokeWidth * 1.8}
        strokeLinecap="round"
      />
    </svg>
  );

  if (glyphOnly) {
    return mark;
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: `${borderRadius}px`,
        background: "linear-gradient(135deg, #24383C 0%, #172326 100%)",
        border: "1px solid rgba(64, 87, 90, 0.92)",
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.25)",
      }}
      className={`relative shrink-0 overflow-hidden flex items-center justify-center ${className}`}
    >
      {mark}
    </div>
  );
};
