import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Ícono para "Agregar a pantalla de inicio" en iOS.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a7d2c 0%, #075c20 100%)",
          color: "white",
          fontSize: 110,
          fontWeight: 800,
        }}
      >
        P
      </div>
    ),
    { ...size }
  );
}
