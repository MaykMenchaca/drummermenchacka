import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import HeroSection from "@/components/home/HeroSection";
import PortfolioSection from "@/components/home/PortfolioSection";
import ProcessSection from "@/components/home/ProcessSection";
import FaqSection from "@/components/home/FaqSection";
import InstagramSection from "@/components/home/InstagramSection";

export default function Home() {
  return (
    <>
      <Header active="portfolio" />
      <main>
        <HeroSection />
        <PortfolioSection />
        <ProcessSection />

        {/* Filosofía */}
        <section id="craft" className="section craft-section">
          <div className="container craft-grid">
            <div className="craft-image" aria-hidden="true" />
            <Reveal>
              <p className="label-caps text-gold">La filosofía</p>
              <h2>
                La aguja traduce historias silenciosas en marcas indelebles de
                identidad.
              </h2>
              <p className="muted-copy">
                Cada pieza se trata como arte fino: composición sobre anatomía,
                flujo del cuerpo, higiene estricta y tintas de calidad profesional.
              </p>
              <Link href="/citas" className="btn btn-primary">
                Iniciar mi proyecto
              </Link>
            </Reveal>
          </div>
        </section>

        {/* El artista */}
        <section id="about" className="section section-dark about-section">
          <Reveal className="container about-inner">
            <p className="label-caps text-gold">El artista</p>
            <h2>Drummer Menchacka</h2>
            <p>
              Artista visual y tatuador profesional especializado en línea fina,
              sombras suaves, blackwork y piezas ilustrativas. Su enfoque une
              dibujo, técnica y lectura corporal para que cada tatuaje envejezca
              con presencia.
            </p>
          </Reveal>
        </section>

        <FaqSection />
        <InstagramSection />
      </main>
      <Footer />
    </>
  );
}
