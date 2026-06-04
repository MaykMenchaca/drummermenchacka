"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import Calendar, {
  DEFAULT_SLOTS,
  fromDateKey,
  monthLabel,
  toMonthKey,
} from "@/components/Calendar";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Icon from "@/components/Icon";
import { CATEGORIES } from "@/components/home/data";
import styles from "./page.module.css";

const UPLOAD_CATEGORIES = CATEGORIES.filter((c) => c !== "Todos");
const STATUS_OPTIONS = ["pending", "confirmed", "completed", "cancelled"];
const STATUS_LABEL = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
};

function normalizeAvailability(days = []) {
  return days.reduce((acc, day) => {
    acc[day.date] = { slots: day.slots || [] };
    return acc;
  }, {});
}

export default function AdminPage() {
  const reduceMotion = useReducedMotion();
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState("");
  const [availability, setAvailabilityState] = useState({});
  const [appointments, setAppointments] = useState([]);
  const [customSlot, setCustomSlot] = useState("");
  const [status, setStatus] = useState("");

  // Galería
  const [tattoos, setTattoos] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [gallery, setGallery] = useState({
    title: "",
    category: UPLOAD_CATEGORIES[0] || "",
    hours: "",
    featured: false,
  });
  const [uploading, setUploading] = useState(false);
  const [galleryMsg, setGalleryMsg] = useState("");

  const selectedSlots = useMemo(() => {
    return (availability[selectedDate]?.slots || []).map((slot) => slot.time);
  }, [availability, selectedDate]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = appointments.filter((appointment) => {
      const appointmentDate = fromDateKey(appointment.date);
      return appointmentDate >= today && appointment.status !== "cancelled";
    }).length;

    return [
      { label: "Proximas citas", value: upcoming },
      { label: "Dias abiertos", value: Object.keys(availability).length },
      { label: "Solicitudes", value: appointments.length },
    ];
  }, [appointments, availability]);

  const reveal = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.26, ease: "easeOut" },
      };

  useEffect(() => {
    fetch("/api/auth")
      .then((response) => response.json())
      .then((data) => setAuthenticated(Boolean(data.authenticated)))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    let isActive = true;

    fetch(`/api/availability?month=${toMonthKey(monthDate)}`)
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!isActive) return;
        if (ok) {
          setAvailabilityState(normalizeAvailability(data.days));
          setStatus("");
        } else {
          setStatus(data.error || "No se pudo cargar la disponibilidad.");
        }
      });

    fetch("/api/appointments")
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (isActive && ok) {
          setAppointments(data.appointments || []);
        }
      });

    return () => {
      isActive = false;
    };
  }, [authenticated, monthDate]);

  async function handleLogin(event) {
    event.preventDefault();
    setLoginError("");

    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      setAuthenticated(true);
      setPassword("");
    } else {
      const data = await response.json();
      setLoginError(data.error || "No se pudo iniciar sesion.");
    }
  }

  // Cargar galería una vez autenticado.
  useEffect(() => {
    if (!authenticated) return;
    let isActive = true;
    fetch("/api/tattoos")
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (isActive && ok) setTattoos(data.tattoos || []);
      });
    return () => {
      isActive = false;
    };
  }, [authenticated]);

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    setAuthenticated(false);
  }

  // ---- Galería ----
  async function handleUpload(event) {
    event.preventDefault();
    if (!imageFile) {
      setGalleryMsg("Elige una foto.");
      return;
    }
    if (!gallery.title.trim() || !gallery.category) {
      setGalleryMsg("Título y categoría son obligatorios.");
      return;
    }
    setUploading(true);
    setGalleryMsg("");
    try {
      const data = new FormData();
      data.append("image", imageFile);
      data.append("title", gallery.title.trim());
      data.append("category", gallery.category);
      data.append("hours", gallery.hours.trim());
      data.append("featured", gallery.featured ? "true" : "false");

      const response = await fetch("/api/tattoos", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo subir la foto.");

      setTattoos((current) => [...current, result.tattoo]);
      setGallery({ title: "", category: UPLOAD_CATEGORIES[0] || "", hours: "", featured: false });
      setImageFile(null);
      event.target.reset?.();
      setGalleryMsg("Foto publicada en el portafolio.");
    } catch (error) {
      setGalleryMsg(error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteTattoo(id) {
    if (!window.confirm("¿Borrar esta foto del portafolio?")) return;
    const response = await fetch(`/api/tattoos/${id}`, { method: "DELETE" });
    if (response.ok) {
      setTattoos((current) => current.filter((t) => t.id !== id));
    } else {
      const data = await response.json().catch(() => ({}));
      setGalleryMsg(data.error || "No se pudo borrar.");
    }
  }

  // ---- Citas ----
  async function handleStatusChange(id, newStatus) {
    const response = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (response.ok) {
      const data = await response.json();
      setAppointments((current) =>
        current.map((a) => (a.id === id ? { ...a, status: data.appointment.status } : a))
      );
    } else {
      setStatus("No se pudo actualizar el estado.");
    }
  }

  async function handleDeleteAppointment(id) {
    if (!window.confirm("¿Borrar esta cita? No se puede deshacer.")) return;
    const response = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
    if (response.ok) {
      setAppointments((current) => current.filter((a) => a.id !== id));
    } else {
      setStatus("No se pudo borrar la cita.");
    }
  }

  function whatsappLink(appointment) {
    const phone = String(appointment.phone || "").replace(/\D/g, "");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const trackUrl = appointment.token ? `${origin}/cita/${appointment.token}` : "";
    const message =
      `Hola ${appointment.name}, soy Drummer Menchacka. Confirmo tu cita para el ` +
      `${appointment.date} a las ${appointment.time}.` +
      (trackUrl ? ` Sigue tu cita aquí: ${trackUrl}` : "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  function toggleSlot(slot) {
    if (!selectedDate) return;

    setAvailabilityState((current) => {
      const currentSlots = current[selectedDate]?.slots || [];
      const exists = currentSlots.some((item) => item.time === slot);
      const nextSlots = exists
        ? currentSlots.filter((item) => item.time !== slot)
        : [...currentSlots, { time: slot, booked: false }];

      return {
        ...current,
        [selectedDate]: {
          slots: nextSlots.sort((a, b) => a.time.localeCompare(b.time)),
        },
      };
    });
  }

  function addCustomSlot() {
    if (!/^\d{2}:\d{2}$/.test(customSlot)) {
      setStatus("Usa el formato HH:MM para agregar un horario.");
      return;
    }
    toggleSlot(customSlot);
    setCustomSlot("");
    setStatus("");
  }

  async function saveSelectedDate() {
    if (!selectedDate) return;

    setStatus("Guardando disponibilidad...");
    const response = await fetch("/api/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selectedDate, slots: selectedSlots }),
    });
    const data = await response.json();

    if (response.ok) {
      setAvailabilityState((current) => ({
        ...current,
        [selectedDate]: {
          slots: (data.availability.slots || []).map((time) => ({
            time,
            booked: false,
          })),
        },
      }));
      setStatus("Disponibilidad guardada.");
    } else {
      setStatus(data.error || "No se pudo guardar.");
    }
  }

  if (!authChecked) {
    return (
      <>
        <Header active="admin" />
        <main className={styles.shell}>
          <div className={styles.container}>Cargando...</div>
        </main>
      </>
    );
  }

  if (!authenticated) {
    return (
      <>
        <Header active="admin" />
        <main className={`${styles.shell} ${styles.authShell}`}>
          <form className={styles.authPanel} onSubmit={handleLogin}>
            <span className={styles.brandRule} aria-hidden="true" />
            <p className="label-caps text-gold">Panel privado</p>
            <h1>Acceso del artista</h1>
            <p className={styles.muted}>
              Gestiona disponibilidad y revisa solicitudes de cita.
            </p>
            {loginError ? <div className={styles.alert}>{loginError}</div> : null}
            <label className="form-label label-caps" htmlFor="admin-password">
              Contrasena
            </label>
            <input
              id="admin-password"
              type="password"
              className={styles.input}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
            <button type="submit" className={`btn btn-primary ${styles.authButton}`}>
              Entrar
            </button>
          </form>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header active="admin" />
      <main className={styles.shell}>
        <div className={styles.container}>
          <motion.div className={styles.heading} {...reveal}>
            <div>
              <p className="label-caps text-gold">Operacion</p>
              <h1 className="title-large">Agenda del estudio</h1>
            </div>
            <button type="button" className="btn btn-secondary" onClick={handleLogout}>
              <Icon name="logOut" size={18} />
              Salir
            </button>
          </motion.div>

          <div className={styles.statsGrid}>
            {stats.map((stat, index) => (
              <motion.article
                key={stat.label}
                className={styles.statCard}
                {...(reduceMotion
                  ? {}
                  : {
                      initial: { opacity: 0, y: 12 },
                      animate: { opacity: 1, y: 0 },
                      transition: { duration: 0.22, delay: index * 0.04, ease: "easeOut" },
                    })}
              >
                <span className="label-caps text-gold">{stat.label}</span>
                <strong>{stat.value}</strong>
              </motion.article>
            ))}
          </div>

          <div className={styles.adminGrid}>
            <motion.section className={styles.panel} {...reveal}>
              <div className={styles.panelHead}>
                <div>
                  <p className="label-caps text-gold">Disponibilidad</p>
                  <h2>{monthLabel(monthDate)}</h2>
                </div>
              </div>
              <Calendar
                admin
                monthDate={monthDate}
                onMonthChange={setMonthDate}
                availability={availability}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </motion.section>

            <motion.section className={styles.panel} {...reveal}>
              <div className={styles.panelHead}>
                <div>
                  <p className="label-caps text-gold">Horarios</p>
                  <h2>
                    {selectedDate
                      ? fromDateKey(selectedDate).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "Elige un dia"}
                  </h2>
                </div>
              </div>

              <div className={styles.slotGrid}>
                {[...new Set([...DEFAULT_SLOTS, ...selectedSlots])].sort().map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={`${styles.slotButton} ${
                      selectedSlots.includes(slot) ? styles.slotSelected : ""
                    }`}
                    disabled={!selectedDate}
                    onClick={() => toggleSlot(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>

              <div className={styles.inlineForm}>
                <input
                  type="text"
                  className={styles.input}
                  value={customSlot}
                  onChange={(event) => setCustomSlot(event.target.value)}
                  placeholder="16:30"
                  inputMode="numeric"
                />
                <button type="button" className="btn btn-secondary" onClick={addCustomSlot}>
                  Agregar
                </button>
              </div>

              <button
                type="button"
                className={`btn btn-primary ${styles.fullButton}`}
                disabled={!selectedDate}
                onClick={saveSelectedDate}
              >
                Guardar dia
              </button>
              {status ? <p className={styles.statusLine}>{status}</p> : null}
            </motion.section>
          </div>

          <motion.section className={`${styles.panel} ${styles.appointmentsPanel}`} {...reveal}>
            <div className={styles.panelHead}>
              <div>
                <p className="label-caps text-gold">Solicitudes</p>
                <h2>Citas recientes</h2>
              </div>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Fecha / Hora</th>
                    <th>Concepto</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.length ? (
                    appointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td>
                          <strong>{appointment.name}</strong>
                          <br />
                          <span className={styles.subtle}>{appointment.email}</span>
                          {appointment.phone ? (
                            <>
                              <br />
                              <span className={styles.subtle}>{appointment.phone}</span>
                            </>
                          ) : null}
                        </td>
                        <td>
                          {appointment.date}
                          <br />
                          <span className="text-gold">{appointment.time}</span>
                        </td>
                        <td className={styles.conceptCell}>{appointment.concept}</td>
                        <td>
                          <select
                            className={styles.statusSelect}
                            value={appointment.status}
                            onChange={(event) =>
                              handleStatusChange(appointment.id, event.target.value)
                            }
                            aria-label="Cambiar estado de la cita"
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {STATUS_LABEL[option]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            {appointment.phone ? (
                              <a
                                className={styles.iconAction}
                                href={whatsappLink(appointment)}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Escribir a ${appointment.name} por WhatsApp`}
                                title="Confirmar por WhatsApp"
                              >
                                <Icon name="whatsapp" size={18} />
                              </a>
                            ) : null}
                            <button
                              type="button"
                              className={styles.iconAction}
                              onClick={() => handleDeleteAppointment(appointment.id)}
                              aria-label={`Borrar cita de ${appointment.name}`}
                              title="Borrar cita"
                            >
                              <Icon name="trash" size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className={styles.emptyCell}>
                        Aun no hay solicitudes guardadas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.section>

          <motion.section className={`${styles.panel} ${styles.appointmentsPanel}`} {...reveal}>
            <div className={styles.panelHead}>
              <div>
                <p className="label-caps text-gold">Galería</p>
                <h2>Sube y cataloga tus trabajos</h2>
              </div>
            </div>

            <form className={styles.galleryForm} onSubmit={handleUpload}>
              <label className={styles.uploader} htmlFor="tattoo-image">
                <Icon name="upload" size={26} />
                <span className="label-caps">
                  {imageFile ? imageFile.name : "Toca para elegir o tomar una foto"}
                </span>
                <input
                  id="tattoo-image"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                />
              </label>

              <div className={styles.galleryFields}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Título (ej. Fénix Ascendente)"
                  value={gallery.title}
                  onChange={(event) => setGallery((g) => ({ ...g, title: event.target.value }))}
                  required
                />
                <select
                  className={styles.input}
                  value={gallery.category}
                  onChange={(event) => setGallery((g) => ({ ...g, category: event.target.value }))}
                >
                  {UPLOAD_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Duración (ej. 4 Horas)"
                  value={gallery.hours}
                  onChange={(event) => setGallery((g) => ({ ...g, hours: event.target.value }))}
                />
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={gallery.featured}
                    onChange={(event) => setGallery((g) => ({ ...g, featured: event.target.checked }))}
                  />
                  <span>Destacada</span>
                </label>
              </div>

              <button type="submit" className={`btn btn-primary ${styles.fullButton}`} disabled={uploading}>
                {uploading ? "Subiendo…" : "Publicar foto"}
              </button>
              {galleryMsg ? <p className={styles.statusLine}>{galleryMsg}</p> : null}
            </form>

            <div className={styles.galleryGrid}>
              {tattoos.map((tattoo) => (
                <figure key={tattoo.id} className={styles.galleryItem}>
                  <span className={styles.galleryImage}>
                    <Image
                      src={tattoo.image_url}
                      alt={tattoo.title}
                      fill
                      sizes="(max-width: 640px) 50vw, 180px"
                    />
                  </span>
                  <figcaption>
                    <span>{tattoo.title}</span>
                    <small>{tattoo.category}</small>
                  </figcaption>
                  <button
                    type="button"
                    className={styles.galleryDelete}
                    onClick={() => handleDeleteTattoo(tattoo.id)}
                    aria-label={`Borrar ${tattoo.title}`}
                    title="Borrar"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </figure>
              ))}
            </div>
          </motion.section>
        </div>
      </main>
      <Footer />
    </>
  );
}
