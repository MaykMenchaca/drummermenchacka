import Link from "next/link";
import Icon from "@/components/Icon";
import styles from "./Footer.module.css";

const SOCIALS = [
  { name: "instagram", label: "Instagram", href: "https://instagram.com" },
  { name: "facebook", label: "Facebook", href: "https://facebook.com" },
  { name: "mail", label: "Email", href: "mailto:hola@example.com" },
  { name: "whatsapp", label: "WhatsApp", href: "https://wa.me/" },
];

export default function Footer() {
  return (
    <footer className={`footer ${styles.footerEnhance}`}>
      <div className="container footer-inner">
        <div className={styles.cta}>
          <p className={styles.ctaText}>¿List@ para tu próxima pieza?</p>
          <Link href="/citas" className="btn btn-primary">
            Agendar cita
          </Link>
        </div>

        <span className={styles.divider} aria-hidden="true" />

        <Link href="/" className="logo">
          Drummer Menchacka
        </Link>

        <div className={`footer-links ${styles.socials}`}>
          {SOCIALS.map((s) => (
            <a
              key={s.name}
              href={s.href}
              className={styles.social}
              aria-label={s.label}
              {...(s.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              <Icon name={s.name} size={20} />
            </a>
          ))}
        </div>

        <p className="footer-copy">
          © {new Date().getFullYear()} Drummer Menchacka. Todos los derechos
          reservados.
        </p>
      </div>
    </footer>
  );
}
