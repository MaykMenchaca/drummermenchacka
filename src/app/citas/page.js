"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { upload } from "@vercel/blob/client";
import Calendar, { fromDateKey, monthLabel, toMonthKey } from "@/components/Calendar";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Icon from "@/components/Icon";
import Link from "next/link";
import styles from "./page.module.css";

function normalizeAvailability(days = []) {
  return days.reduce((acc, day) => {
    acc[day.date] = { slots: day.slots || [] };
    return acc;
  }, {});
}

// Reduce una imagen a máx `maxDim` px (lado mayor) y la re-comprime a JPEG,
// para que las referencias ocupen poco en el almacenamiento. Devuelve un File.
async function compressImage(file, maxDim = 1280, quality = 0.8) {
  if (!file.type?.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    return file; // si algo falla, sube el original
  }
}

const MAX_REFERENCES = 5;

export default function Citas() {
  const reduceMotion = useReducedMotion();
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [availability, setAvailability] = useState({});
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", concept: "" });
  const [references, setReferences] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingRefs, setUploadingRefs] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [successToken, setSuccessToken] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const selectedSlots = useMemo(() => {
    return availability[selectedDate]?.slots || [];
  }, [availability, selectedDate]);

  useEffect(() => {
    let isActive = true;
    fetch(`/api/availability?month=${toMonthKey(monthDate)}`)
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!isActive) return;
        if (!ok) throw new Error(data.error || "No se pudo cargar la agenda.");
        const nextAvailability = normalizeAvailability(data.days);
        setAvailability(nextAvailability);
        const currentSelection = nextAvailability[selectedDate]?.slots?.some(
          (slot) => !slot.booked
        );
        if (!currentSelection) {
          const firstOpenDay = Object.entries(nextAvailability).find(([, day]) =>
            day.slots.some((slot) => !slot.booked)
          );
          setSelectedDate(firstOpenDay?.[0] || "");
          setSelectedTime(
            firstOpenDay?.[1].slots.find((slot) => !slot.booked)?.time || ""
          );
        }
      })
      .catch((error) => {
        if (isActive) setErrorMsg(error.message);
      });

    return () => {
      isActive = false;
    };
  }, [monthDate, selectedDate]);

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function handleFileChange(event) {
    if (event.target.files) {
      // Máximo MAX_REFERENCES imágenes.
      setReferences([...event.target.files].slice(0, MAX_REFERENCES));
    }
  }

  function handleSelectDate(dateKey) {
    const firstAvailableSlot = availability[dateKey]?.slots?.find((slot) => !slot.booked);
    setSelectedDate(dateKey);
    setSelectedTime(firstAvailableSlot?.time || "");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedDate || !selectedTime) {
      setErrorMsg("Elige una fecha y horario disponible.");
      return;
    }
    if (!formData.name || !formData.email || !formData.phone || !formData.concept) {
      setErrorMsg("Completa todos los campos del formulario, incluido tu WhatsApp.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      // 1) Subir las imágenes de referencia a Vercel Blob (directo desde el navegador).
      let uploadedRefs = [];
      if (references.length) {
        setUploadingRefs(true);
        uploadedRefs = await Promise.all(
          references.map(async (file) => {
            const compressed = await compressImage(file);
            const result = await upload(`references/${compressed.name}`, compressed, {
              access: "public",
              handleUploadUrl: "/api/upload",
            });
            return { url: result.url, pathname: result.pathname };
          })
        );
        setUploadingRefs(false);
      }

      // 2) Crear la cita con las URLs de las referencias.
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          date: selectedDate,
          time: selectedTime,
          references: uploadedRefs,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al registrar la cita.");
      }

      setSuccessToken(data.appointment?.token || "");
      setSubmitSuccess(true);
    } catch (error) {
      setErrorMsg(error.message || "No se pudo completar la solicitud.");
    } finally {
      setUploadingRefs(false);
      setIsSubmitting(false);
    }
  }

  const selectedDateLabel = selectedDate
    ? fromDateKey(selectedDate).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Selecciona un dia";
  const canSubmit = Boolean(selectedDate && selectedTime);
  const submitHelp = canSubmit
    ? "Deposito requerido tras confirmacion."
    : "Elige un dia y horario disponible.";
  const submitLabel = uploadingRefs
    ? "Subiendo imágenes…"
    : isSubmitting
    ? "Procesando…"
    : "Confirmar cita";

  const reveal = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.28, ease: "easeOut" },
      };

  return (
    <>
      <Header active="citas" />
      <main className={styles.shell}>
        <div className={styles.container}>
          {submitSuccess ? (
            <motion.section className={styles.successPanel} {...reveal}>
              <div className={styles.successMark}>
                <Icon name="check" size={40} />
              </div>
              <h1>Solicitud enviada</h1>
              <p>
                Tu solicitud para el {selectedDateLabel} a las {selectedTime} fue
                registrada. <strong>Drummer Menchacka te confirmará por WhatsApp.</strong>
              </p>

              {successToken ? (
                <div className={styles.trackBox}>
                  <p className="label-caps">Sigue el estado de tu cita</p>
                  <div className={styles.trackRow}>
                    <Link href={`/cita/${successToken}`} className={styles.trackLink}>
                      /cita/{successToken.slice(0, 8)}…
                    </Link>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        const url = `${window.location.origin}/cita/${successToken}`;
                        navigator.clipboard?.writeText(url);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2000);
                      }}
                    >
                      {linkCopied ? "¡Copiado!" : "Copiar enlace"}
                    </button>
                  </div>
                  <p className={styles.helper}>
                    Guarda este enlace: ahí verás cuando tu cita quede confirmada.
                  </p>
                </div>
              ) : null}

              <div className={styles.successActions}>
                {process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ? (
                  <a
                    className="btn btn-primary"
                    href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(
                      `Hola, acabo de agendar una cita para el ${selectedDateLabel} a las ${selectedTime}. Mi nombre es ${formData.name}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon name="whatsapp" size={16} />
                    <span style={{ marginLeft: "8px" }}>Escríbeme por WhatsApp</span>
                  </a>
                ) : null}
                <Link href="/" className="btn btn-secondary">
                  Volver al portafolio
                </Link>
              </div>
            </motion.section>
          ) : (
            <form onSubmit={handleSubmit}>
              <motion.div className={styles.heading} {...reveal}>
                <div>
                  <p className="label-caps text-gold">Reserva privada</p>
                  <h1 className="title-large">Agenda tu sesion</h1>
                </div>
                <p className={styles.headingCopy}>
                  El calendario solo muestra fechas abiertas por el artista.
                </p>
              </motion.div>

              {errorMsg ? <div className={styles.alert}>{errorMsg}</div> : null}

              <div className={styles.bookingGrid}>
                <motion.section className={styles.panel} {...reveal}>
                  <p className="label-caps text-gold">01. Fecha y hora</p>
                  <Calendar
                    monthDate={monthDate}
                    onMonthChange={setMonthDate}
                    availability={availability}
                    selectedDate={selectedDate}
                    onSelectDate={handleSelectDate}
                  />

                  <div className={styles.slotSection}>
                    <div className={styles.slotHead}>
                      <p className="label-caps">Horarios disponibles</p>
                      <span>{monthLabel(monthDate)}</span>
                    </div>
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={selectedDate || "empty"}
                        className={styles.slotGrid}
                        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      >
                        {selectedSlots.length ? (
                          selectedSlots.map((slot) => (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={slot.booked}
                              className={`${styles.slotButton} ${
                                selectedTime === slot.time ? styles.slotSelected : ""
                              }`}
                              onClick={() => setSelectedTime(slot.time)}
                            >
                              {slot.time}
                            </button>
                          ))
                        ) : (
                          <p className={styles.muted}>No hay horarios abiertos para este dia.</p>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </motion.section>

                <motion.section className={styles.panel} {...reveal}>
                  <p className="label-caps text-gold">02. Detalles</p>
                  <div className={styles.formGroup}>
                    <label className="form-label label-caps" htmlFor="name">
                      Nombre completo
                    </label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Ej. Julian Casablancas"
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className="form-label label-caps" htmlFor="email">
                      Email de contacto
                    </label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="julian@example.com"
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className="form-label label-caps" htmlFor="phone">
                      WhatsApp
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Ej. 52 449 123 4567"
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className="form-label label-caps" htmlFor="concept">
                      Concepto del tatuaje
                    </label>
                    <textarea
                      id="concept"
                      name="concept"
                      value={formData.concept}
                      onChange={handleInputChange}
                      placeholder="Describe colocacion, estilo, tamano y detalles..."
                      className={`${styles.input} ${styles.textarea}`}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className="form-label label-caps" htmlFor="references">
                      Referencias visuales
                    </label>
                    <label className={styles.uploader} htmlFor="references">
                      <Icon name="upload" size={28} />
                      <span className="label-caps">
                        {references.length
                          ? `${references.length} archivo(s) seleccionado(s)`
                          : "Haz clic para elegir archivos"}
                      </span>
                      <input
                        id="references"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className={styles.helper}>
                      Hasta {MAX_REFERENCES} imágenes. Se envían junto con tu solicitud para que
                      Drummer las revise.
                    </p>
                  </div>
                </motion.section>

                <motion.aside className={styles.summaryCard} {...reveal}>
                  <p className="label-caps text-gold">Resumen</p>
                  <h2>{selectedDateLabel}</h2>
                  <dl>
                    <div>
                      <dt>Hora</dt>
                      <dd>{selectedTime || "Sin horario"}</dd>
                    </div>
                    <div>
                      <dt>Contacto</dt>
                      <dd>{formData.email || "Pendiente"}</dd>
                    </div>
                  </dl>
                  <div className={styles.estimate}>
                    <div className={styles.estimateIcon}>
                      <Icon name="clock" />
                    </div>
                    <div>
                      <p className="label-caps">Estimacion de sesion</p>
                      <strong>4-6 horas</strong>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className={`btn btn-primary ${styles.confirmButton}`}
                    disabled={isSubmitting || !canSubmit}
                  >
                    {submitLabel}
                  </button>
                  <p className={canSubmit ? styles.helper : styles.actionHint}>
                    {submitHelp}
                  </p>
                </motion.aside>
              </div>

              <div className={styles.mobileSummary}>
                <div className={styles.mobileSummaryDetails}>
                  <div>
                    <p className="label-caps">Fecha</p>
                    <strong>{selectedDateLabel}</strong>
                  </div>
                  <div>
                    <p className="label-caps">Hora</p>
                    <strong>{selectedTime || "Pendiente"}</strong>
                  </div>
                </div>
                <button
                  type="submit"
                  className={`btn btn-primary ${styles.mobileConfirmButton}`}
                  disabled={isSubmitting || !canSubmit}
                >
                  {isSubmitting ? "Procesando..." : "Confirmar cita"}
                </button>
                <p className={canSubmit ? styles.mobileHelper : styles.mobileActionHint}>
                  {submitHelp}
                </p>
              </div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
