import { Inter, EB_Garamond } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
});

export const metadata = {
  title: "Drummer Menchacka | Portfolio & Citas",
  description: "Estudio de tatuaje profesional de Drummer Menchacka - Arte y precisión en tinta.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${inter.variable} ${ebGaramond.variable}`}>
      <body>{children}</body>
    </html>
  );
}
