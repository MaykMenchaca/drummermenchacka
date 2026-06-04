import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Icon from "@/components/Icon";
import { getAppointmentByToken } from "@/app/lib/db";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

function formatLongDate(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// El link caduca: cita cancelada, o ya pasó (con 1 día de gracia).
function isExpired(appointment) {
  if (appointment.status === "cancelled") return true;
  const [y, m, d] = appointment.date.split("-").map(Number);
  const apptDay = new Date(y, m - 1, d);
  const grace = new Date();
  grace.setHours(0, 0, 0, 0);
  grace.setDate(grace.getDate() - 1);
  return apptDay < grace;
}

const STATUS = {
  pending: { label: "Pendiente de confirmación", tone: "pending", note: "Drummer revisará tu solicitud y te confirmará por WhatsApp." },
  confirmed: { label: "¡Cita confirmada!", tone: "confirmed", note: "Tu sesión está apartada. Te esperamos el día indicado." },
  completed: { label: "Sesión completada", tone: "completed", note: "¡Gracias por confiar tu piel a Drummer Menchacka!" },
};

export default async function CitaStatusPage({ params }) {
  const { token } = await params;
  let appointment = null;
  try {
    appointment = await getAppointmentByToken(token);
  } catch {
    appointment = null;
  }

  const expired = appointment ? isExpired(appointment) : true;
  const wa = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

  return (
    <>
      <Header />
      <main className={styles.shell}>
        {!appointment || expired ? (
          <section className={styles.card}>
            <div className={`${styles.mark} ${styles.expired}`}>
              <Icon name="clock" size={34} />
            </div>
            <p className="label-caps text-gold">Seguimiento de cita</p>
            <h1>Este enlace ya no está disponible</h1>
            <p className={styles.note}>
              El enlace pudo haber caducado o la cita ya pasó. Si necesitas una nueva
              sesión, agenda de nuevo y recibirás un enlace fresco.
            </p>
            <Link href="/citas" className="btn btn-primary">Agendar una cita</Link>
          </section>
        ) : (
          <section className={styles.card}>
            <div className={`${styles.mark} ${styles[STATUS[appointment.status]?.tone || "pending"]}`}>
              <Icon name={appointment.status === "pending" ? "clock" : "check"} size={34} />
            </div>
            <p className="label-caps text-gold">Seguimiento de cita</p>
            <h1>{STATUS[appointment.status]?.label || "Tu cita"}</h1>

            <dl className={styles.details}>
              <div>
                <dt>Cliente</dt>
                <dd>{appointment.name}</dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>{formatLongDate(appointment.date)}</dd>
              </div>
              <div>
                <dt>Hora</dt>
                <dd className="text-gold">{appointment.time}</dd>
              </div>
            </dl>

            <p className={styles.note}>{STATUS[appointment.status]?.note}</p>

            {wa && (
              <a
                className="btn btn-secondary"
                href={`https://wa.me/${wa}?text=${encodeURIComponent(
                  `Hola, sigo mi cita del ${formatLongDate(appointment.date)} a las ${appointment.time}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="whatsapp" size={16} />
                <span style={{ marginLeft: "8px" }}>Escribir por WhatsApp</span>
              </a>
            )}
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
