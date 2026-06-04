"use client";

// Sección de portafolio con layout bento + lightbox.
// La pieza `featured` ocupa un bloque grande; el resto rellena alrededor.
// Filtros por categoría, hover con caption deslizante, reveal escalonado.

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { TATTOO_DATA, CATEGORIES } from "@/components/home/data";
import Lightbox from "./Lightbox";
import styles from "./PortfolioSection.module.css";

// Lógica de filtrado congelada (referencia del contrato):
// "Todos" -> todo; "Otros" -> lo que no cae en las categorías nombradas;
// el resto -> category.toLowerCase().includes(cat.toLowerCase()).
const NAMED = ["Realismo", "Fineline", "Blackwork", "Lettering"];

function matchesCategory(piece, cat) {
  if (cat === "Todos") return true;
  const category = piece.category.toLowerCase();
  if (cat === "Otros") {
    return !NAMED.some((n) => category.includes(n.toLowerCase()));
  }
  return category.includes(cat.toLowerCase());
}

export default function PortfolioSection({ tattoos }) {
  const [activeCat, setActiveCat] = useState("Todos");
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // Fuente: la galería desde la base (si llega) o el catálogo estático de respaldo.
  // Normaliza image_url -> image para que el resto del componente y el Lightbox no cambien.
  const source = useMemo(() => {
    const list = tattoos && tattoos.length ? tattoos : TATTOO_DATA;
    return list.map((t) => ({ ...t, image: t.image_url || t.image }));
  }, [tattoos]);

  const filtered = useMemo(
    () => source.filter((p) => matchesCategory(p, activeCat)),
    [source, activeCat]
  );

  function selectCategory(cat) {
    setActiveCat(cat);
    // Evita que un índice abierto quede fuera de rango al cambiar de filtro.
    setLightboxIndex(null);
  }

  function openLightbox(i) {
    setLightboxIndex(i);
  }

  return (
    <section id="portfolio" className={styles.portfolio}>
      <div className="container">
        <header className={styles.header}>
          <p className="label-caps text-gold">Galería</p>
          <h2 className={styles.title}>Trabajos seleccionados</h2>

          <div className={styles.filters} role="group" aria-label="Filtrar por categoría">
            {CATEGORIES.map((cat) => {
              const isActive = cat === activeCat;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`${styles.filter} ${isActive ? styles.filterActive : ""}`}
                  onClick={() => selectCategory(cat)}
                  aria-pressed={isActive}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </header>

        {filtered.length === 0 ? (
          <p className={styles.empty}>No hay piezas en esta categoría todavía.</p>
        ) : (
          <div className={styles.grid} key={activeCat}>
            {filtered.map((piece, i) => (
              <div
                key={piece.id}
                className={`${styles.cell} ${piece.featured ? styles.cellFeatured : ""}`}
              >
                <button
                  type="button"
                  className={styles.card}
                  onClick={() => openLightbox(i)}
                  aria-label={`Ver ${piece.title} en detalle`}
                >
                  <span className={styles.media}>
                    <Image
                      src={piece.image}
                      alt={piece.title}
                      className={styles.image}
                      fill
                      sizes={
                        piece.featured
                          ? "(max-width: 920px) 100vw, 50vw"
                          : "(max-width: 600px) 100vw, (max-width: 920px) 50vw, 25vw"
                      }
                    />
                  </span>
                  <span className={styles.captionWrap} aria-hidden="true">
                    <span className={styles.caption}>
                      <span className={styles.cardTitle}>{piece.title}</span>
                      <span className={styles.cardMeta}>
                        <span className={styles.cardCategory}>{piece.category}</span>
                        <span className={styles.cardDot}>·</span>
                        <span>{piece.hours}</span>
                      </span>
                    </span>
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={styles.cta}>
          <Link href="/citas" className="btn btn-primary">
            Agendar cita
          </Link>
        </div>
      </div>

      <Lightbox
        items={filtered}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </section>
  );
}
