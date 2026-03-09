import { SVGProps } from "react";

export function KingstoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="KingstoneGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#D32F2F", stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: "#FBC02D", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#1976D2", stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      {/* WiFi Arcs - Kenya Flag Colors */}
      <path
        d="M50 85 A 35 35 0 0 1 15 50"
        fill="none"
        stroke="#D32F2F"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M65 70 A 20 20 0 0 1 30 50"
        fill="none"
        stroke="#FBC02D"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M80 55 A 5 5 0 0 1 45 50"
        fill="none"
        stroke="#1976D2"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Center Dot */}
      <circle cx="50" cy="50" r="6" fill="#1976D2" />
    </svg>
  );
}
