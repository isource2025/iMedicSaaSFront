import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Política de Privacidad | iMedic',
  description:
    'Política de privacidad de iMedic e iSource. Información sobre el tratamiento de datos personales, incluyendo el canal de WhatsApp Business.',
};

const UPDATED = '17 de junio de 2026';

export default function PoliticaDePrivacidadPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.brand}>iMedic</span>
          <Link href="/" className={styles.backLink}>
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>Política de Privacidad</h1>
        <p className={styles.updated}>Última actualización: {UPDATED}</p>

        <section className={styles.section}>
          <h2>1. Introducción</h2>
          <p>
            La presente Política de Privacidad describe cómo se recopilan, utilizan,
            almacenan y protegen los datos personales en relación con la plataforma{' '}
            <strong>iMedic</strong>, desarrollada por{' '}
            <a href="https://isource.vercel.app/" target="_blank" rel="noopener noreferrer">
              iSource
            </a>
            , y con los servicios de mensajería a través de <strong>WhatsApp Business</strong>{' '}
            integrados en dicha plataforma.
          </p>
          <p>
            Cada institución de salud que utiliza iMedic actúa como{' '}
            <strong>responsable del tratamiento</strong> de los datos de sus pacientes.
            iSource actúa como <strong>encargado del tratamiento</strong> en la medida en que
            procesa datos por cuenta de dichas instituciones para prestar el servicio tecnológico.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Alcance</h2>
          <p>Esta política aplica a:</p>
          <ul>
            <li>Usuarios del sistema iMedic (personal de salud y administrativo).</li>
            <li>
              Pacientes y personas que interactúan con el asistente virtual de turnos por{' '}
              <strong>WhatsApp</strong>.
            </li>
            <li>
              Visitantes de este sitio web y de las páginas públicas asociadas al servicio.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. Datos que recopilamos</h2>
          <p>Según el canal de uso, podemos tratar las siguientes categorías de datos:</p>
          <ul>
            <li>
              <strong>Identificación:</strong> nombre, documento nacional de identidad (DNI),
              fecha de nacimiento, sexo y datos demográficos básicos.
            </li>
            <li>
              <strong>Contacto:</strong> número de teléfono de WhatsApp, correo electrónico y
              domicilio cuando corresponda.
            </li>
            <li>
              <strong>Datos clínicos y administrativos:</strong> historias clínicas, turnos,
              internaciones, indicaciones y demás información gestionada por la institución de
              salud en iMedic.
            </li>
            <li>
              <strong>Comunicaciones por WhatsApp:</strong> mensajes de texto, audios (y su
              transcripción automática a texto), metadatos del mensaje (fecha, hora, identificador
              del número) e historial de la conversación con el asistente virtual.
            </li>
            <li>
              <strong>Datos de acceso:</strong> credenciales de usuario del personal, registros de
              actividad, dirección IP, tipo de navegador y datos técnicos de conexión.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. Finalidad del tratamiento</h2>
          <p>Los datos personales se utilizan para:</p>
          <ul>
            <li>Prestar y operar la plataforma iMedic.</li>
            <li>
              Gestionar turnos, consultas y comunicaciones con pacientes a través de WhatsApp
              Business.
            </li>
            <li>
              Validar la identidad de pacientes (por ejemplo, mediante consultas a registros
              oficiales como RENAPER, cuando la institución lo habilite).
            </li>
            <li>Permitir la atención humana cuando un operador toma una conversación.</li>
            <li>Garantizar la seguridad, auditoría y correcto funcionamiento del servicio.</li>
            <li>Cumplir obligaciones legales y regulatorias aplicables.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. Base legal</h2>
          <p>
            El tratamiento de datos se realiza sobre la base de la ejecución de un contrato o
            relación de prestación de servicios de salud, el cumplimiento de obligaciones legales,
            el consentimiento del titular cuando corresponda (por ejemplo, al iniciar una
            conversación por WhatsApp) y el interés legítimo en mantener un servicio seguro y
            operativo.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Compartición con terceros</h2>
          <p>Los datos pueden compartirse únicamente con:</p>
          <ul>
            <li>
              <strong>Meta Platforms, Inc.</strong> (WhatsApp Business / Cloud API), como
              proveedor de infraestructura de mensajería. Meta procesa los mensajes conforme a su
              propia política de privacidad disponible en{' '}
              <a
                href="https://www.whatsapp.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
              >
                whatsapp.com/legal/privacy-policy
              </a>
              .
            </li>
            <li>
              <strong>Proveedores tecnológicos</strong> que prestan servicios de hosting,
              transcripción de audio, bases de datos u otros servicios necesarios para operar
              iMedic, siempre bajo acuerdos de confidencialidad y protección de datos.
            </li>
            <li>
              <strong>Organismos públicos</strong> cuando la institución de salud deba verificar
              identidad o cumplir requerimientos legales (por ejemplo, RENAPER en Argentina).
            </li>
            <li>
              <strong>Autoridades competentes</strong> cuando exista una obligación legal de
              divulgación.
            </li>
          </ul>
          <p>No vendemos ni comercializamos datos personales de pacientes.</p>
        </section>

        <section className={styles.section}>
          <h2>7. Conservación de los datos</h2>
          <p>
            Los datos se conservan durante el tiempo necesario para cumplir las finalidades
            descritas y las obligaciones legales de la institución de salud. Los plazos de
            retención de historias clínicas y registros médicos se rigen por la normativa sanitaria
            aplicable en cada jurisdicción.
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. Seguridad</h2>
          <p>
            Implementamos medidas técnicas y organizativas razonables para proteger los datos
            personales, incluyendo control de acceso, cifrado en tránsito, segregación por
            institución (multi-tenant) y registro de actividades. Ningún sistema es completamente
            infalible; en caso de incidente de seguridad, se notificará conforme a la normativa
            vigente.
          </p>
        </section>

        <section className={styles.section}>
          <h2>9. Derechos de los titulares</h2>
          <p>
            De acuerdo con la legislación aplicable (incluyendo la Ley 25.326 de Protección de
            Datos Personales de Argentina), los titulares pueden solicitar:
          </p>
          <ul>
            <li>Acceso a sus datos personales.</li>
            <li>Rectificación de datos inexactos o incompletos.</li>
            <li>Supresión o bloqueo cuando corresponda.</li>
            <li>Información sobre el origen de los datos y las cesiones realizadas.</li>
          </ul>
          <p>
            Para ejercer estos derechos, el paciente debe contactar a la{' '}
            <strong>institución de salud</strong> donde recibe atención. Para consultas
            relacionadas con el funcionamiento tecnológico de iMedic, puede escribir a{' '}
            <a href="mailto:contacto@isource.com.ar">contacto@isource.com.ar</a>.
          </p>
        </section>

        <section className={styles.section}>
          <h2>10. Menores de edad</h2>
          <p>
            El tratamiento de datos de menores se realiza en el marco de la relación de atención
            médica y con la participación de sus padres, tutores o representantes legales, conforme
            a la normativa sanitaria y de protección de datos aplicable.
          </p>
        </section>

        <section className={styles.section}>
          <h2>11. Cambios a esta política</h2>
          <p>
            Podemos actualizar esta Política de Privacidad para reflejar cambios legales,
            técnicos o en nuestros servicios. La fecha de última actualización se indicará al
            inicio del documento. El uso continuado del servicio tras la publicación de cambios
            implica la aceptación de la versión vigente.
          </p>
        </section>

        <section className={styles.section}>
          <h2>12. Contacto</h2>
          <p>
            <strong>iSource</strong> — Desarrollador de iMedic
            <br />
            Correo:{' '}
            <a href="mailto:contacto@isource.com.ar">contacto@isource.com.ar</a>
            <br />
            Web:{' '}
            <a href="https://isource.vercel.app/" target="_blank" rel="noopener noreferrer">
              isource.vercel.app
            </a>
          </p>
        </section>

        <footer className={styles.footer}>
          © {new Date().getFullYear()} iSource. Todos los derechos reservados.
        </footer>
      </main>
    </div>
  );
}
