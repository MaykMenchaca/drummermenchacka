"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "./Icon";
import styles from "./Header.module.css";

export default function Header({ active = "home" }) {
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { href: "/#portfolio", label: "Portafolio", key: "portfolio" },
    { href: "/#process", label: "Proceso", key: "process" },
    { href: "/citas", label: "Agendar Cita", key: "citas" },
    { href: "/#about", label: "Sobre Mi", key: "about" },
    { href: "/#faq", label: "FAQ", key: "faq" },
  ];

  return (
    <header className={`header ${styles.headerEnhance}`}>
      <div className="container header-inner">
        <Link href="/" className="logo" onClick={() => setIsOpen(false)}>
          Drummer Menchacka
        </Link>
        <button
          type="button"
          className="icon-button nav-toggle"
          aria-label={isOpen ? "Cerrar menu" : "Abrir menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
        >
          <Icon name={isOpen ? "close" : "menu"} />
        </button>
        <nav className={`nav ${isOpen ? "nav-open" : ""}`}>
          {links.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={`nav-link label-caps ${
                active === link.key ? "active" : ""
              }`}
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
