"use client";

import { useEffect, useMemo, useState } from "react";
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
import styles from "./page.module.css";

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

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    setAuthenticated(false);
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
                    <th>Contacto</th>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Concepto</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.length ? (
                    appointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td>{appointment.name}</td>
                        <td>{appointment.email}</td>
                        <td>{appointment.date}</td>
                        <td>{appointment.time}</td>
                        <td>{appointment.concept}</td>
                        <td>
                          <span className={`${styles.statusPill} ${styles[appointment.status] || ""}`}>
                            {appointment.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className={styles.emptyCell}>
                        Aun no hay solicitudes guardadas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.section>
        </div>
      </main>
      <Footer />
    </>
  );
}
