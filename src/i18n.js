const labels = {
  es: {
    languageName: "Idioma",
    languageDesc: "Cambia el idioma de toda la interfaz de Unique Suite en esta bóveda.",
    spanish: "Español",
    english: "English",
    interfaceHeading: "Interfaz",
    graphHeading: "Vista de grafo",
    graphDesc: "Para mostrar solo la estructura académica, usa el filtro: path:Semestres",
    modulesHeading: "Módulos",
    modulesDesc: "US-Core administra semestres y ramos. US-Agenda administra calendario y eventos.",
  },
  en: {
    languageName: "Language",
    languageDesc: "Change the language of the entire Unique Suite interface in this vault.",
    spanish: "Spanish",
    english: "English",
    interfaceHeading: "Interface",
    graphHeading: "Graph view",
    graphDesc: "To show only the academic structure, use this filter: path:Semestres",
    modulesHeading: "Modules",
    modulesDesc: "US-Core manages semesters and courses. US-Agenda manages the calendar and events.",
  },
};

const spanishToEnglish = {
  "Gestor Universitario": "University Manager",
  "Administra semestres, ramos, tipos de apunte y sincronización de toda la bóveda.": "Manage semesters, courses, note types, and vault-wide synchronization.",
  "Confirmar antes de crear una nota diaria": "Confirm before creating a daily note",
  "Cuando abras un día sin nota desde el calendario, Unique pedirá confirmación antes de crearla.": "When you open a day without a note from the calendar, Unique will ask for confirmation before creating it.",
  "Semestres": "Semesters",
  "+ Crear Semestre": "+ Create semester",
  "Ramos": "Courses",
  "+ Añadir Ramo": "+ Add course",
  "Nombre del ramo *": "Course name *",
  "Nombre del profesor *": "Professor name *",
  "Sigla del ramo": "Course abbreviation",
  "Sigla del profesor": "Professor abbreviation",
  "Prefijo de apuntes": "Note prefix",
  "Crear ramo": "Create course",
  "Cancelar": "Cancel",
  "Horario": "Schedule",
  "Abrir Índice": "Open index",
  "Tipos de Apunte Predeterminados": "Default note types",
  "Clase": "Class",
  "Lectura": "Reading",
  "Módulo": "Module",
  "Semana": "Week",
  "Estudio": "Study",
  "Nuevo tipo (ej. Control, Taller, Laboratorio)": "New type (e.g. Quiz, Workshop, Laboratory)",
  "+ Añadir": "+ Add",
  "Mantenimiento y Sincronización": "Maintenance and synchronization",
  "Reparar y sincronizar toda la bóveda": "Repair and synchronize the entire vault",
  "Revisa todos los semestres, normaliza etiquetas de propiedades, conecta versiones de IA y actualiza todos los índices.": "Review all semesters, normalize property labels, connect AI versions, and update all indexes.",
  "Reparar Bóveda": "Repair vault",
  "Procesando…": "Processing…",
  "Limpiar notas diarias vacías": "Clean empty daily notes",
  "Elimina archivos diarios que no tengan ningún apunte ni texto.": "Delete daily files that contain neither notes nor text.",
  "Limpiar Diarios": "Clean daily notes",
  "Revisar recordatorios ahora": "Check reminders now",
  "Comprueba Sistema/Recordatorios.md sin esperar al ciclo automático.": "Check Sistema/Recordatorios.md without waiting for the automatic cycle.",
  "Revisar": "Check",
  "Preparar esta bóveda": "Set up this vault",
  "Crea carpetas y archivos base si faltan, útil al instalar el sistema en otro PC.": "Create missing folders and starter files, useful when installing the system on another computer.",
  "Preparar bóveda": "Set up vault",
  "Preparar": "Set up",
  "Abrir Inicio": "Open Home",
  "Mostrar calendario": "Show calendar",
  "Nueva clase (Ctrl+Shift+D)": "New class (Ctrl+Shift+D)",
  "Panel de Control Universitario": "University Control Panel",
  "Abrir Panel de Control Universitario": "Open University Control Panel",
  "Abrir Inicio / Nueva pestaña": "Open Home / New tab",
  "Abrir nota de hoy": "Open today's note",
  "Crear apunte de clase": "Create class note",
  "Reabrir última clase": "Reopen last class",
  "Captura rápida en el apunte actual": "Quick capture in the current note",
  "Insertar cierre rápido de clase": "Insert quick class wrap-up",
  "Vincular nota actual con el día de hoy": "Link current note to today",
  "Marcar fuente IA del apunte": "Mark note AI source",
  "Preparar bóveda universitaria": "Set up university vault",
  "Calendario": "Calendar",
  "Hoy": "Today",
  "Mes": "Month",
  "Anterior": "Previous",
  "Siguiente": "Next",
  "Nueva nota diaria": "New daily note",
  "Título": "Title",
  "Inicio": "Start",
  "Fin": "End",
  "Categoría": "Category",
  "Calendarios": "Calendars",
  "Calendarios / capas": "Calendars / layers",
  "Carpeta de eventos": "Events folder",
  "Notas Markdown con frontmatter tipo: evento.": "Markdown notes with event frontmatter type: event.",
  "Historial": "History",
  "Nota donde se registran altas, cambios y bajas.": "Log for created, changed, and deleted events.",
  "Recordatorios de Unique": "Unique reminders",
  "Tabla a la que se puede añadir una fila desde un evento.": "Table where an event can add a row.",
  "Carpeta del diario": "Daily notes folder",
  "Se abre Diario/YYYY-MM/YYYY-MM-DD.md (formato Unique).": "Uses Diario/YYYY-MM/YYYY-MM-DD.md (Unique format).",
  "Inicio de semana": "Week starts on",
  "Lunes": "Monday",
  "Domingo": "Sunday",
  "Capas / calendarios visibles": "Visible layers / calendars",
  "Horario Unique": "Unique schedule",
  "Lunes es lo habitual en Chile / locale es.": "Monday is the usual start in Chile / Spanish locale.",
  "Colores (estilo Google Calendar)": "Colors (Google Calendar style)",
  "Mapa de colores (JSON)": "Color map (JSON)",
  "Google Calendar (ICS — recomendado)": "Google Calendar (ICS — recommended)",
  "Sincronización automática": "Automatic synchronization",
  "Intervalo auto-sync (minutos)": "Auto-sync interval (minutes)",
  "Eliminar eventos Google ausentes del ICS": "Remove Google events absent from ICS",
  "Sincronizar ahora": "Synchronize now",
  "Importar / sync": "Import / sync",
  "Google API (opcional, fallback)": "Google API (optional, fallback)",
  "Activar importación por API (token)": "Enable API import (token)",
  "Última sync:": "Last sync:",
  "Convive con Unique: no modifica su código. El horario activo se lee en solo lectura. Los recordatorios y el diario siguen siendo de Unique.": "Works alongside Unique without modifying its code. The active schedule is read-only. Reminders and daily notes remain managed by Unique.",
  "También disponibles en el botón «Calendarios» de la vista. Si Horario Unique y Google Clases se solapan, apaga uno de los dos.": "Also available from the view's Calendars button. If Unique schedule and Google Classes overlap, turn one of them off.",
  "Relleno = color personalizado del mapa por ramo/título, o el campo color del evento. Borde = origen (horario cian, local azul, Google naranja). El centro sigue este mapa; puedes editarlo abajo.": "Fill = custom color from the course/title map or the event color field. Border = source (cyan schedule, blue local, orange Google). The center follows this map; you can edit it below.",
  "Clave normalizada (sin acentos, minúsculas) → hex. Ejemplo: {\"calculo i\": \"#5484ed\"}. Se fusiona con el mapa pre-sembrado.": "Normalized key (lowercase, without accents) → hex. Example: {\"calculo i\": \"#5484ed\"}. It is merged with the seeded map.",
  "Si hay al menos una URL ICS, al cargar el plugin sincroniza una vez y luego cada N minutos (mientras Obsidian esté abierto).": "If there is at least one ICS URL, the plugin synchronizes once on load and then every N minutes while Obsidian is open.",
  "Por defecto 60. Mínimo 15, máximo 360.": "Default 60. Minimum 15, maximum 360.",
  "Igual que el comando «Importar desde Google Calendar». Muestra un aviso con el resultado.": "Same as the Import from Google Calendar command. Shows a notice with the result.",
  "Marcador de posición para el flujo OAuth futuro.": "Placeholder for the future OAuth flow.",
  "Access token (pruebas)": "Access token (testing)",
  "Usa «primary» o el ID del calendario (correo o ...@group.calendar.google.com).": "Use primary or the calendar ID (email or ...@group.calendar.google.com).",
  "Nombre del ramo": "Course name",
  "Nombre del profesor": "Professor name",
  "Año": "Year",
  "Periodo": "Term",
  "Fecha de inicio": "Start date",
  "Fecha de fin": "End date",
  "Establecer como semestre activo": "Set as active semester",
  "Añadir nuevo ramo": "Add new course",
  "0 apuntes registrados": "0 notes recorded",
  "Guardar": "Save",
  "Eliminar": "Delete",
  "● Activo": "● Active",
  "Archivado": "Archived",
  "Sin fecha": "No date",
  "No se encontraron notas.": "No notes found.",
  "No hay notas recientes.": "No recent notes.",
  "Diario": "Daily notes",
  "Índice": "Index",
  "Semestre": "Semester",
  "Buenos días": "Good morning",
  "Buenas tardes": "Good afternoon",
  "Buenas noches": "Good evening",
  "Recientes": "Recent",
  "Todo": "All",
  "Apuntes": "Notes",
  "Índices": "Indexes",
  "Capturas": "Captures",
  "Nuevo apunte": "New note",
  "Captura rápida": "Quick capture",
  "Diario de hoy": "Today's note",
  "Último apunte": "Last note",
  "Panel": "Dashboard",
  "Buscar notas o apuntes...": "Search notes...",
  "Buscar notas o apuntes": "Search notes",
  "Ramos 2026-2": "Courses 2026-2",
  "Captura rápida guardada.": "Quick capture saved.",
  "Destino": "Destination",
  "Sistema/Capturas rápidas": "System/Quick captures",
  "Destino:": "Destination:",
  "Tipo de captura": "Capture type",
  "Idea, duda o pendiente": "Idea, question, or task",
  "Se añadirá al apunte con la hora actual.": "It will be added to the note with the current time.",
  "Se guardará como una nota independiente.": "It will be saved as a separate note.",
  "Escribe algo para guardar la captura.": "Write something to save the capture.",
  "Guardar captura": "Save capture",
  "Duda": "Question",
  "Pendiente": "Task",
  "Importante": "Important",
  "Nota": "Note",
  "Cursos": "Courses",
  "Sistema": "System",
  "Plantillas": "Templates",
  "Recordatorios": "Reminders",
  "Capturas rápidas": "Quick captures",
  "Eventos locales": "Local events",
  "Bloques de Horario.md": "Schedule blocks.md",
  "Clases": "Classes",
  "Oficial": "Official",
  "Espiritual": "Spiritual",
  "Otros": "Other",
  "Opcional: Otros": "Optional: Other",
  "Google: Clases": "Google: Classes",
  "Google: Oficial": "Google: Official",
  "Google: Espiritual": "Google: Spiritual",
  "Google / ICS": "Google / ICS",
  "Calendarios Google / ICS": "Google / ICS calendars",
  "Calendarios externos": "External calendars",
  "Una URL secreta iCal por línea. Todas se muestran en la misma capa externa.": "One secret iCal URL per line. All of them appear in the same external layer.",
  "Las rutas son ubicaciones de archivos; no cambian al cambiar el idioma. Agenda detecta automáticamente las variantes española e inglesa existentes.": "Paths are file locations; they do not change when the interface language changes. Agenda automatically detects existing Spanish and English variants.",
  "Calendarios externos (Google u Outlook)": "External calendars (Google or Outlook)",
  "Añadir calendario externo": "Add external calendar",
  "Añade una URL ICS por línea. Google: usa la Dirección secreta en formato iCal. Outlook: usa el enlace ICS de Publicar un calendario. Las URLs son secretas: no las compartas ni las subas a git.": "Add one ICS URL per line. Google: use the Secret address in iCal format. Outlook: use the ICS link from Publish a calendar. URLs are secret: do not share or commit them.",
  "Pega un enlace ICS de Google u Outlook. Puedes incluir varios, uno por línea; se muestran en la misma capa externa.": "Paste an ICS link from Google or Outlook. You can add several, one per line; they appear in the same external layer.",
  "Aún no hay calendarios externos.": "There are no external calendars yet.",
  "Calendario externo": "External calendar",
  "Eliminar calendario": "Remove calendar",
  "+ Añadir calendario": "+ Add calendar",
  "Añade todos los enlaces ICS de Google u Outlook que necesites. Cada calendario se sincroniza por separado y comparte la misma capa externa.": "Add as many ICS links from Google or Outlook as you need. Each calendar synchronizes separately and shares the same external layer.",
  "Pega las URLs secretas iCal (ICS) en Ajustes → Unique Agenda. Ver ayuda allí.": "Paste secret iCal (ICS) URLs in Settings → Unique Agenda. See help there.",
  "Activa «Importar desde Google» en Ajustes o pega URLs ICS.": "Enable Import from Google in Settings or paste ICS URLs.",
  "El evento no tiene fecha de inicio válida.": "The event does not have a valid start date.",
  "Fila añadida a Recordatorios de Unique.": "Row added to Unique reminders.",
  "El título no puede estar vacío.": "The title cannot be empty.",
  "El fin debe ser posterior al inicio.": "The end must be after the start.",
  "Tipo de apunte": "Note type",
  "Selecciona o añade un tipo predeterminado.": "Select or add a default note type.",
  "Otro": "Other",
  "Nombre del apunte": "Note name",
  "Ej. Taller, Laboratorio, Ayudantía, Control.": "E.g. Workshop, Laboratory, Tutorial, Quiz.",
  "Ej. Taller": "E.g. Workshop",
  "Guardar este tipo como predeterminado para el futuro": "Save this type as a default for the future",
  "Nombre o tema (opcional)": "Name or topic (optional)",
  "Tema específico del apunte.": "Specific topic of the note.",
  "Ej. Introducción al curso": "E.g. Course introduction",
  "Número": "Number",
  "Correlativo automático por serie.": "Automatic sequence number.",
  "IA usada (opcional)": "AI used (optional)",
  "Si fue desarrollado con IA (ChatGPT, Claude, Gemini, etc.).": "If it was developed with AI (ChatGPT, Claude, Gemini, etc.).",
  "Crear apunte": "Create note",
  "También disponibles en el botón «Calendarios» de la vista. Si Horario Unique y el calendario externo se solapan, apaga uno de los dos.": "Also available from the view's Calendars button. If Unique schedule and the external calendar overlap, turn one of them off.",
  "Usa «Calendarios» para ocultar Horario Unique o el calendario externo si se solapan.": "Use Calendars to hide Unique schedule or the external calendar when they overlap.",
  "Desactiva Horario Unique o el calendario externo si se solapan. Los cambios se guardan al instante.": "Turn off Unique schedule or the external calendar if they overlap. Changes are saved immediately.",
  "Desactiva Horario Unique o Google Clases si se solapan. Los cambios se guardan al instante.": "Turn off Unique schedule or Google Classes if they overlap. Changes are saved immediately.",
  "Feed extra u otras agendas. También acepta la antigua URL única (icsUrl).": "Extra feed or other calendars. It also accepts the former single URL (icsUrl).",
  "URL secreta iCal de este calendario. Vacío = no sincronizar esta capa.": "Secret iCal URL for this calendar. Empty = do not synchronize this layer.",
  "Unique Agenda sincroniza sola mientras Obsidian está abierto. No hace falta Grok Bot ni OAuth para el uso diario. En Google Calendar (web): abre el calendario → tres puntos → Configuración y uso compartido → Integrar calendario → «Dirección secreta en formato iCal». Copia esa URL (una por calendario) y pégala abajo. Las URLs son secretas: no las compartas ni las subas a git.": "Unique Agenda synchronizes while Obsidian is open. Grok Bot and OAuth are not needed for daily use. In Google Calendar (web), open a calendar, then Settings and sharing, Integrate calendar, and copy its Secret address in iCal format. Paste one URL per calendar below. URLs are secret: do not share or commit them.",
  "Último error:": "Last error:",
  "Sincronización ICS integrada (Ajustes → Unique Agenda). Independiente de Grok Bot.": "Built-in ICS synchronization (Settings → Unique Agenda). Independent from Grok Bot.",
  "Mostrar": "Show",
  "Ocultar": "Hide",
  "Abrir": "Open",
  "Cerrar": "Close",
  "Error": "Error",
  "Éxito": "Success",
  "Notas creadas en la agenda": "Notes created in the agenda",
  "Google / ICS (otros)": "Google / ICS (other)",
  "Google sin etiqueta conocida": "Google without a known label",
  "Nuevo evento": "New event",
  "Importar desde Google Calendar": "Import from Google Calendar",
  "Abrir diario de hoy": "Open today's note",
  "Clic en un día para ver sus eventos · Calendarios para filtrar capas": "Click a day to view its events · Calendars to filter layers",
  "Usa «Calendarios» para ocultar Horario Unique o Google Clases si se solapan.": "Use Calendars to hide Unique schedule or Google Classes when they overlap.",
  "Todo el día": "All day",
  "Clic para ver el día": "Click to view the day",
  "Crear un evento en este día": "Create an event on this day",
  "No hay eventos este día. Pulsa «Nuevo evento» para crear uno.": "There are no events on this day. Select New event to create one.",
  "Eliminar evento": "Delete event",
  "Abrir diario de Unique": "Open Unique daily note",
  "Ver semana": "View week",
  "Ver mes": "View month",
  "Horario Unique (solo lectura)": "Unique schedule (read-only)",
  "Editar evento": "Edit event",
  "Nombre del evento": "Event name",
  "Abrir nota": "Open note",
  "Revisa las fechas de inicio y fin.": "Check the start and end dates.",
  "El centro/relleno usa este color o el mapa de ramos. El borde indica el origen (local/horario/Google).": "The fill uses this color or the course map. The border indicates its source (local/schedule/Google).",
  "Bloque del horario de Unique (solo lectura). Edítalo en Horario.md.": "Unique schedule block (read-only). Edit it in Horario.md.",
  "Solo si no usas ICS. Access token de prueba (caduca ~1 h). Client ID/secret son marcadores para OAuth futuro. Se guardan en data.json — no los subas a git.": "Only if you do not use ICS. Test access token (expires in about one hour). Client ID and secret are placeholders for future OAuth. They are stored in data.json; do not commit them.",
  "Token OAuth con scope https://www.googleapis.com/auth/calendar.readonly. Caduca; no es un flujo permanente.": "OAuth token with https://www.googleapis.com/auth/calendar.readonly scope. It expires and is not a permanent flow.",
  "Por defecto OFF (seguro). Si lo activas, tras cada sync se envían a la papelera las notas origen:google de ese calendario cuya googleId ya no aparece en el ICS, solo dentro de una ventana de −30 / +90 días. No borra eventos locales ni fuera de ventana.": "Default OFF (safe). When enabled, after each sync, Google-source notes whose googleId is no longer present in that calendar's ICS are moved to the trash, only within a −30 / +90 day window. Local and out-of-window events are not removed.",
};

const englishToSpanish = Object.fromEntries(
  Object.entries(spanishToEnglish).map(([from, to]) => [to, from])
);

function normalizeLanguage(language) {
  return language === "en" ? "en" : "es";
}

function translate(value, language) {
  if (typeof value !== "string") return value;
  const table = normalizeLanguage(language) === "en" ? spanishToEnglish : englishToSpanish;
  let translated = table[value] || value;
  if (normalizeLanguage(language) === "en") {
    translated = translated.replace(/^Semestre (.+)$/, "Semester $1");
    translated = translated.replace(/^(\d+) ramos$/, "$1 courses");
    translated = translated.replace(/^(\d+) ramo$/, "$1 course");
    translated = translated.replace(/^(\d+) apuntes registrados$/, "$1 notes recorded");
    translated = translated.replace(/^Ramos (.+)$/, "Courses $1");
    translated = translated.replace(/^Calendario externo (\d+)$/, "External calendar $1");
    translated = translated.replace(/^Evento creado: (.+)$/, "Event created: $1");
    translated = translated.replace(/^Evento actualizado: (.+)$/, "Event updated: $1");
    translated = translated.replace(/^Evento enviado a la papelera: (.+)$/, "Event moved to trash: $1");
    translated = translated.replace(/^No encuentro (.+)$/, "Cannot find $1");
    translated = translated.replace(/^No hay diario para (.+)\. Créalo con Unique \(Ctrl\+Shift\+P\)\.$/, "No daily note exists for $1. Create it with Unique (Ctrl+Shift+P).");
    translated = translated.replace(/^Sync Google: (\d+) cambio\(s\), (\d+) evento\(s\) vistos\.$/, "Google sync: $1 change(s), $2 event(s) found.");
    translated = translated.replace(/^Sync Google: sin cambios \((\d+) evento\(s\) vistos\)\.$/, "Google sync: no changes ($1 event(s) found).");
    translated = translated.replace(/^Error al sincronizar Google Calendar: (.+)$/, "Google Calendar sync error: $1");
  }
  return translated;
}

function translatePath(path, language) {
  if (typeof path !== "string" || !path) return path;
  const pathSegments = {
    en: {
      "00 Inicio": "00 Home",
      Inicio: "Home",
      Semestres: "Semesters",
      Cursos: "Courses",
      Diario: "Daily",
      Sistema: "System",
      Agenda: "Agenda",
      Eventos: "Events",
      Historial: "History",
      Plantillas: "Templates",
      Recordatorios: "Reminders",
      "Capturas rápidas": "Quick captures",
    },
    es: {
      "00 Home": "00 Inicio",
      Home: "Inicio",
      Semesters: "Semestres",
      Courses: "Cursos",
      Daily: "Diario",
      System: "Sistema",
      Agenda: "Agenda",
      Events: "Eventos",
      History: "Historial",
      Templates: "Plantillas",
      Reminders: "Recordatorios",
      "Quick captures": "Capturas rápidas",
    },
  };
  const current = normalizeLanguage(language);
  return path
    .split("/")
    .map((segment) => pathSegments[current][segment] || translate(segment, current))
    .join("/");
}

function translateElement(root, language) {
  const ownerDocument = root?.ownerDocument || (typeof document !== "undefined" ? document : null);
  const nodeFilter = ownerDocument?.defaultView?.NodeFilter || globalThis.NodeFilter;
  if (!root || !ownerDocument || !nodeFilter) return;
  const walker = ownerDocument.createTreeWalker(root, nodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const result = translate(node.nodeValue, language);
    if (result !== node.nodeValue) node.nodeValue = result;
  }
  root.querySelectorAll?.("[title], [placeholder], [aria-label]").forEach((element) => {
    for (const attribute of ["title", "placeholder", "aria-label"]) {
      const value = element.getAttribute(attribute);
      const result = translate(value, language);
      if (result !== value) element.setAttribute(attribute, result);
    }
  });
}

function installDomLocalization(language) {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") {
    return () => {};
  }
  const root = document.body;
  if (!root) return () => {};
  translateElement(root, language);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData") translateElement(mutation.target.parentElement, language);
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE) translateElement(node.parentElement, language);
        if (node.nodeType === Node.ELEMENT_NODE) translateElement(node, language);
      }
    }
  });
  observer.observe(root, { childList: true, characterData: true, subtree: true });
  return () => observer.disconnect();
}

function createI18n(language) {
  const current = normalizeLanguage(language);
  return {
    language: current,
    momentLocale: current,
    t(key) {
      return labels[current][key] || labels.es[key] || key;
    },
  };
}

module.exports = { createI18n, installDomLocalization, translate, translateElement, translatePath, normalizeLanguage };
