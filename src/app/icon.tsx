import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Ícono de la app (favicon + PWA). Se genera como PNG en el build.
export default function Icon() {
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
          fontSize: 300,
          fontWeight: 800,
        }}
      >
        P
      </div>
    ),
    { ...size }
  );
}
