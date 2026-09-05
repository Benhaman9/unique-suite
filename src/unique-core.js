const {
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  ItemView,
  TFile,
  TFolder,
  moment,
  normalizePath,
  setIcon,
} = require("obsidian");

const bundledCalendarModule = require("./calendar-original.js");

const VIEW_TYPE_HOME = "inicio-personalizado-view";
const VIEW_TYPE_CALENDAR = "calendar";
let OriginalCalendarView = null;
let originalCalendarSettings = null;
let originalCalendarDefaultSettings = null;
let originalCalendarActiveFile = null;
let UniqueOriginalCalendarView = null;

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function withoutExtension(filePath) {
  return filePath.replace(/\.md$/i, "");
}

function sanitizeFilePart(value) {
  return String(value || "")
    .replace(/[\\/:*?"<>|#[\]]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*-\s*/g, " - ")
    .trim();
}

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}


/** Collect .md files under a folder tree (scoped; avoids whole-vault enumeration). */
function collectMarkdownUnder(root, out = []) {
  if (!root) return out;
  if (root instanceof TFile) {
    if (root.extension === "md") out.push(root);
    return out;
  }
  if (root instanceof TFolder) {
    for (const child of root.children) collectMarkdownUnder(child, out);
  }
  return out;
}

/** Scoped markdown listing for university folders only. */
function getScopedMarkdownFiles(app, folders) {
  const out = [];
  const seen = new Set();
  for (const folder of folders) {
    const path = normalizePath(folder);
    if (!path) continue;
    const root = app.vault.getAbstractFileByPath(path);
    const files = collectMarkdownUnder(root, []);
    for (const file of files) {
      if (seen.has(file.path)) continue;
      seen.add(file.path);
      out.push(file);
    }
  }
  return out;
}

const UNIQUE_SCOPE_FOLDERS = ["Diario", "Semestres", "Sistema"];


function yamlString(value) {
  return JSON.stringify(String(value ?? ""));
}

function normalizeAISource(value) {
  const source = sanitizeFilePart(value);
  if (!source) return "";
  const lower = source.toLocaleLowerCase("es").replace(/[\s\-_.]/g, "");

  const known = {
    // OpenAI / ChatGPT
    chatgpt: "ChatGPT",
    gpt: "ChatGPT",
    gpt4: "ChatGPT",
    gpt4o: "ChatGPT",
    openai: "ChatGPT",
    o1: "ChatGPT",
    o3: "ChatGPT",
    o3mini: "ChatGPT",

    // Anthropic / Claude
    claude: "Claude",
    cld: "Claude",
    anthropic: "Claude",
    sonnet: "Claude",
    opus: "Claude",
    haiku: "Claude",
    claude3: "Claude",
    claude35: "Claude",
    claude37: "Claude",

    // Google / Gemini / NotebookLM
    gemini: "Gemini",
    gem: "Gemini",
    google: "Gemini",
    bard: "Gemini",
    notebooklm: "NotebookLM",
    nlm: "NotebookLM",

    // DeepSeek
    deepseek: "DeepSeek",
    ds: "DeepSeek",
    deepseekv3: "DeepSeek",
    deepseekr1: "DeepSeek",
    r1: "DeepSeek",

    // Perplexity
    perplexity: "Perplexity",
    per: "Perplexity",
    pplx: "Perplexity",

    // Copilot
    copilot: "Copilot",
    cop: "Copilot",
    githubcopilot: "Copilot",
    mscopilot: "Copilot",

    // Grok / xAI
    grok: "Grok",
    grk: "Grok",
    xai: "Grok",

    // Mistral AI
    mistral: "Mistral",
    mst: "Mistral",
    lechat: "Mistral",
    codestral: "Mistral",
    mixtral: "Mistral",

    // Meta Llama
    llama: "Llama",
    llm: "Llama",
    metaai: "Llama",
    llama3: "Llama",

    // Qwen / Alibaba
    qwen: "Qwen",
    qwn: "Qwen",
    qwq: "Qwen",

    // Kimi / Moonshot
    kimi: "Kimi",
    kmi: "Kimi",
    moonshot: "Kimi",

    // Poe / Ollama
    poe: "Poe",
    ollama: "Ollama",
    oll: "Ollama",
  };

  return known[lower] || source;
}

function aiCode(source) {
  const normalized = normalizeAISource(source);
  if (!normalized) return "";
  const known = {
    chatgpt: "GPT",
    claude: "CLD",
    gemini: "GEM",
    notebooklm: "NLM",
    deepseek: "DS",
    perplexity: "PER",
    copilot: "COP",
    grok: "GRK",
    mistral: "MST",
    llama: "LLM",
    qwen: "QWN",
    kimi: "KMI",
    poe: "POE",
    ollama: "OLL",
  };
  const lower = normalized.toLocaleLowerCase("es").replace(/[\s\-_.]/g, "");
  if (known[lower]) return known[lower];
  const compact = normalized.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return compact.slice(0, 3) || "IA";
}

function aiSuffix(source) {
  const code = aiCode(source);
  return code ? `(${code})` : "";
}

const AI_SUFFIX_PATTERN =
  /\s+\((?:IA\s*)?(?:GPT|ChatGPT|Claude|CLD|Gemini|GEM|DeepSeek|DS|Perplexity|PER|PPLX|Copilot|COP|Grok|GRK|Mistral|MST|Llama|LLM|Qwen|QWN|NotebookLM|NLM|Kimi|KMI|Poe|POE|Ollama|OLL|IA)\)$/i;

function stripAISuffix(name) {
  return String(name || "")
    .replace(/\s+-\s+IA\s+[^-()]+$/i, "")
    .replace(AI_SUFFIX_PATTERN, "")
    .trim();
}

function detectAISourceFromFilename(name) {
  const match = String(name || "").match(
    /\((?:IA\s*)?(GPT|ChatGPT|Claude|CLD|Gemini|GEM|DeepSeek|DS|Perplexity|PER|PPLX|Copilot|COP|Grok|GRK|Mistral|MST|Llama|LLM|Qwen|QWN|NotebookLM|NLM|Kimi|KMI|Poe|POE|Ollama|OLL)\)$/i
  );
  if (!match) return "";
  return normalizeAISource(match[1]);
}

function timeToMinutes(value) {
  const match = String(value || "").trim().match(/^([0-9]{1,2}):([0-9]{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

const DEFAULT_NOTE_LABELS = ["Clase", "Lectura", "Módulo", "Semana", "Estudio"];

function normalizeNoteLabel(value) {
  const label = sanitizeFilePart(value || "Clase");
  return label || "Clase";
}

function getNoteTypeMeta(noteLabel, period) {
  const clean = normalizeNoteLabel(noteLabel);
  const norm = normalizeSearch(clean).replace(/[^a-z0-9]/g, "");
  const tipo = norm || "clase";

  let cssclasses = [tipo, "apunte"];
  if (tipo === "clase") {
    cssclasses = ["clase"];
  } else if (
    tipo === "control" ||
    tipo === "prueba" ||
    tipo === "examen" ||
    tipo === "evaluacion"
  ) {
    cssclasses = [tipo, "evaluacion"];
  }

  const tags = ["universidad", `periodo/${period}`, `tipo/${tipo}`];

  return { tipo, tags, cssclasses };
}

function parseHorario(content) {
  const rows = [];
  for (const line of String(content || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const cells = trimmed
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
    if (cells.length < 4) continue;
    const [day, start, end, course] = cells;
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);
    if (startMinutes === null || endMinutes === null || !course) continue;
    rows.push({ day: normalizeSearch(day), startMinutes, endMinutes, course });
  }
  return rows;
}

function classNumberFrom(file, frontmatter) {
  const explicit = String(
    frontmatter?.numero ?? frontmatter?.numero_clase ?? ""
  ).trim();
  const source =
    explicit ||
    file.basename.match(
      /\b(?:Clase|M[oó]dulo|Semana|Lectura|Estudio|Control|Prueba|Taller|Laboratorio|Ayudant[ií]a)\s+([0-9]+(?:[.,-][0-9A-Za-z]+)?)/i
    )?.[1] ||
    "";
  const numeric = Number.parseFloat(source.replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function noteLabelFrom(file, frontmatter) {
  const explicit = normalizeNoteLabel(
    frontmatter?.etiqueta_apunte || frontmatter?.tipo_apunte || ""
  );
  if (explicit !== "Clase") return explicit;
  const match = file.basename.match(
    /\b(Clase|M[oó]dulo|Semana|Lectura|Estudio|Control|Prueba|Taller|Laboratorio|Ayudant[ií]a)\s+[0-9]+(?:[.,-][0-9A-Za-z]+)?/i
  );
  if (!match) return "Clase";
  const normalized = normalizeSearch(match[1]);
  if (normalized === "modulo") return "Módulo";
  if (normalized === "semana") return "Semana";
  if (normalized === "lectura") return "Lectura";
  if (normalized === "estudio") return "Estudio";
  if (normalized === "control") return "Control";
  if (normalized === "prueba") return "Prueba";
  if (normalized === "taller") return "Taller";
  if (normalized === "laboratorio") return "Laboratorio";
  if (normalized === "ayudantia") return "Ayudantía";
  return "Clase";
}

function sectionBounds(content, heading) {
  const headingParts = heading.match(/^(#{1,6})\s+(.+)$/);
  const headingText = headingParts?.[2] || heading;
  const headingPattern = new RegExp(
    `^(#{1,6})[\\t ]+${escapeRegExp(headingText)}[\\t ]*\\r?$`,
    "m"
  );
  const match = headingPattern.exec(content);
  if (!match) return null;

  const sectionStart = match.index + match[0].length;
  const rest = content.slice(sectionStart);
  const currentLevel = match[1].length;
  const laterHeadings = /\n(#{1,6})[ \t]+/g;
  let nextHeading;
  let sectionEnd = content.length;
  while ((nextHeading = laterHeadings.exec(rest)) !== null) {
    if (nextHeading[1].length <= currentLevel) {
      sectionEnd = sectionStart + nextHeading.index;
      break;
    }
  }

  return { start: sectionStart, end: sectionEnd };
}

function appendLinkToSection(content, heading, link) {
  if (content.includes(link)) return content;

  const section = sectionBounds(content, heading);
  if (!section) return `${content.trimEnd()}\n\n${heading}\n\n- ${link}\n`;

  const sectionEnd = section.end;
  return `${content.slice(0, sectionEnd).trimEnd()}\n- ${link}\n${content
    .slice(sectionEnd)
    .replace(/^\n+/, "\n")}`;
}

function appendLineToSection(content, heading, line) {
  const section = sectionBounds(content, heading);
  if (!section) return `${content.trimEnd()}\n\n${heading}\n\n${line}\n`;

  return `${content.slice(0, section.end).trimEnd()}\n${line}\n${content
    .slice(section.end)
    .replace(/^\n+/, "\n")}`;
}

function removeLinkFromContent(content, targetLinkPattern) {
  const lines = content.split(/\r?\n/);
  const filtered = [];
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (targetLinkPattern.test(line)) {
      modified = true;
      continue;
    }
    filtered.push(line);
  }

  if (!modified) return content;

  const resultLines = [];
  for (let i = 0; i < filtered.length; i++) {
    const line = filtered[i];
    if (/^##\s+/.test(line)) {
      let hasSubContent = false;
      for (let j = i + 1; j < filtered.length; j++) {
        const nextLine = filtered[j].trim();
        if (/^#{1,6}\s+/.test(nextLine)) break;
        if (nextLine.length > 0) {
          hasSubContent = true;
          break;
        }
      }
      if (!hasSubContent) {
        continue;
      }
    }
    resultLines.push(line);
  }

  return resultLines.join("\n").replace(/\n{3,}/g, "\n\n");
}

function isDailyNoteEmpty(content) {
  let body = content.replace(/^---[\s\S]*?---\r?\n?/, "");
  body = body.replace(/^#\s+[^\r\n]+\r?\n?/, "");
  body = body.replace(/^##\s+[^\r\n]+\r?\n?/gm, "");
  const hasLinks = /\[\[[\s\S]*?\]\]/.test(body);
  const hasText = body.replace(/\s+/g, "").length > 0;
  return !hasLinks && !hasText;
}

function managedBlockPattern(startMarker, endMarker, legacyMarkers) {
  const pairs = [[startMarker, endMarker], ...(legacyMarkers || [])];
  const alternation = pairs
    .map(
      ([start, end]) =>
        `${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`
    )
    .join("|");
  return new RegExp(alternation);
}

function upsertManagedBlock(
  content,
  heading,
  startMarker,
  endMarker,
  lines,
  legacyMarkers
) {
  const block = `${startMarker}\n${lines.join("\n")}\n${endMarker}`;
  const existingPattern = managedBlockPattern(
    startMarker,
    endMarker,
    legacyMarkers
  );
  if (existingPattern.test(content))
    return content.replace(existingPattern, block);

  const section = sectionBounds(content, heading);
  if (!section) return `${content.trimEnd()}\n\n${heading}\n\n${block}\n`;

  return `${content.slice(0, section.end).trimEnd()}\n\n${block}\n${content
    .slice(section.end)
    .replace(/^\n+/, "\n")}`;
}

function frontmatterScalar(content, key) {
  const match = content.match(
    new RegExp(`^${escapeRegExp(key)}:[\\t ]*(.*?)[\\t ]*\\r?$`, "m")
  );
  if (!match) return "";
  const raw = match[1].trim();
  if (!raw) return "";
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      return String(JSON.parse(raw));
    } catch {
      return raw.slice(1, -1);
    }
  }
  if (raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1);
  return raw;
}

const TIPOS_RECORDATORIO = new Set(["semanal", "anual", "unico", "antes"]);

function parseRecordatorios(content) {
  const rows = [];
  for (const line of String(content || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const cells = trimmed
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
    if (cells.length < 5) continue;

    const [tipo, cuando, diasAntes, hora, texto] = cells;
    const tipoNormalizado = normalizeSearch(tipo);
    if (!TIPOS_RECORDATORIO.has(tipoNormalizado) || !texto) continue;
    if (timeToMinutes(hora) === null) continue;

    rows.push({
      tipo: tipoNormalizado,
      cuando: cuando.trim(),
      diasAntes: Number.parseInt(diasAntes, 10),
      hora: hora.trim(),
      texto: texto.trim(),
    });
  }
  return rows;
}

// ─── Modal Selección de Ramo ────────────────────────────────────────────────

class CourseSelectModal extends Modal {
  constructor(plugin, captureContext, courses, suggestedName) {
    super(plugin.app);
    this.plugin = plugin;
    this.captureContext = captureContext;
    this.courses = courses;
    this.filteredCourses = courses;
    this.suggestedName = suggestedName || "";
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("captura-clases-modal", "captura-clases-selector");
    contentEl.createEl("h2", { text: "¿Qué ramo es?", cls: "modal-title" });
    contentEl.createEl("p", {
      text: `${this.captureContext.date} · ${this.captureContext.period}`,
      cls: "captura-clases-contexto",
    });

    const suggestedCourse = this.suggestedName
      ? this.courses.find(
          (course) =>
            normalizeSearch(course.name) === normalizeSearch(this.suggestedName)
        )
      : null;
    if (suggestedCourse) {
      contentEl.createEl("p", {
        text: `Según tu horario: ${suggestedCourse.name}`,
        cls: "captura-clases-sugerencia",
      });
    }

    const search = contentEl.createEl("input", {
      attr: {
        type: "search",
        placeholder: "Buscar ramo",
        autocomplete: "off",
        spellcheck: "false",
      },
    });
    const results = contentEl.createDiv({ cls: "captura-clases-ramos" });
    this.selectedIndex = 0;

    let mouseHasMoved = false;
    contentEl.addEventListener(
      "mousemove",
      () => {
        mouseHasMoved = true;
      },
      { once: true }
    );

    const choose = (course) => {
      this.close();
      new ClassDetailsModal(this.plugin, this.captureContext, course).open();
    };

    const updateSelection = () => {
      results.querySelectorAll(".captura-clases-ramo").forEach((el, index) => {
        el.toggleClass("is-selected", index === this.selectedIndex);
      });
    };

    const moveSelection = (delta) => {
      if (!this.filteredCourses.length) return;
      const count = this.filteredCourses.length;
      let nextIndex = this.selectedIndex + delta;

      // Clamp para evitar el efecto "portal" (wrapping)
      if (nextIndex < 0) nextIndex = 0;
      if (nextIndex >= count) nextIndex = count - 1;

      this.selectedIndex = nextIndex;
      updateSelection();
    };

    const render = () => {
      const query = normalizeSearch(search.value);
      this.filteredCourses = this.courses.filter((course) =>
        normalizeSearch(
          `${course.prefix} ${course.name} ${course.professor}`
        ).includes(query)
      );

      if (query) {
        this.selectedIndex = 0;
      } else {
        const suggestedIndex = this.suggestedName
          ? this.filteredCourses.findIndex(
              (course) =>
                normalizeSearch(course.name) ===
                normalizeSearch(this.suggestedName)
            )
          : -1;
        this.selectedIndex = suggestedIndex !== -1 ? suggestedIndex : 0;
      }

      results.empty();

      if (!this.filteredCourses.length) {
        results.createEl("p", {
          text: "No encontré ese ramo.",
          cls: "captura-clases-sin-resultados",
        });
        return;
      }

      this.filteredCourses.forEach((course, index) => {
        const isSuggested =
          this.suggestedName &&
          normalizeSearch(course.name) === normalizeSearch(this.suggestedName);
        const button = results.createEl("button", {
          cls: `captura-clases-ramo${
            index === this.selectedIndex ? " is-selected" : ""
          }${isSuggested ? " is-suggested" : ""}`,
        });
        button.createEl("strong", {
          text: `${course.prefix} · ${course.name}`,
        });
        if (isSuggested) {
          button.createEl("span", {
            text: "Sugerido",
            cls: "captura-clases-etiqueta",
          });
        }
        button.createEl("small", { text: course.professor });
        button.addEventListener("click", () => choose(course));
        button.addEventListener("mouseenter", () => {
          if (!mouseHasMoved) return;
          this.selectedIndex = index;
          updateSelection();
        });
      });
    };

    search.addEventListener("input", render);
    search.addEventListener("keydown", (event) => {
      const columns = 2;
      const count = this.filteredCourses.length;
      const currentRow = Math.floor(this.selectedIndex / columns);
      const currentCol = this.selectedIndex % columns;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        // Si hay una fila abajo en la misma columna, vamos ahí. Si no, volvemos a la fila 0 de esa columna.
        let nextIndex = this.selectedIndex + columns;
        if (nextIndex >= count) {
          nextIndex = currentCol;
        }
        this.selectedIndex = nextIndex;
        updateSelection();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        // Si hay una fila arriba, subimos. Si no, vamos a la última fila posible de esa columna.
        let nextIndex = this.selectedIndex - columns;
        if (nextIndex < 0) {
          // Buscamos el último elemento en esa columna
          nextIndex = currentCol;
          while (nextIndex + columns < count) {
            nextIndex += columns;
          }
        }
        this.selectedIndex = nextIndex;
        updateSelection();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        // Intercambiar entre columna 0 y 1 de la misma fila.
        // Si en la columna 1 no hay nada (fila incompleta), no hace nada o se queda igual.
        if (currentCol === 0) {
          if (this.selectedIndex + 1 < count) {
            this.selectedIndex = this.selectedIndex + 1;
          }
        } else {
          this.selectedIndex = this.selectedIndex - 1;
        }
        updateSelection();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        // Lo mismo que derecha: saltar al otro lado de la fila.
        if (currentCol === 1) {
          this.selectedIndex = this.selectedIndex - 1;
        } else {
          // Si estamos en col 0, intentamos ir a col 1 si existe.
          if (this.selectedIndex + 1 < count) {
            this.selectedIndex = this.selectedIndex + 1;
          }
        }
        updateSelection();
      } else if (event.key === "Enter") {
        event.preventDefault();
        const course = this.filteredCourses[this.selectedIndex];
        if (course) choose(course);
      }
    });

    render();
    window.setTimeout(() => search.focus(), 50);
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ─── Modal Formulario de Clase / Apunte ──────────────────────────────────────

class ClassDetailsModal extends Modal {
  constructor(plugin, captureContext, course) {
    super(plugin.app);
    this.plugin = plugin;
    this.captureContext = captureContext || plugin.getCaptureContext();
    this.course = course;
    this.topic = "";
    this.noteLabelKind = "Clase";
    this.customNoteLabel = "";
    this.saveCustomAsDefault = false;
    this.noteLabel = "Clase";
    this.number = plugin.suggestNextClassNumber(course);
    this.aiSource = "";
  }

  async onOpen() {
    try {
      this.labelsList = await this.plugin.getPersistentNoteLabels();
      this.renderForm();
    } catch (error) {
      console.error("No se pudo construir el formulario de clase:", error);
      this.contentEl.empty();
      this.contentEl.createEl("h2", { text: "No se pudo abrir el formulario" });
      this.contentEl.createEl("p", {
        text: String(error?.message || error),
        cls: "captura-clases-error",
      });
      const close = this.contentEl.createEl("button", { text: "Cerrar" });
      close.addEventListener("click", () => this.close());
      new Notice(
        "Falló el formulario de clase. El detalle quedó visible en el cuadro.",
        9000
      );
    }
  }

  renderForm() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("captura-clases-modal");
    contentEl.createEl("h2", { text: this.course.name, cls: "modal-title" });
    contentEl.createEl("p", {
      text: `${this.captureContext.date} · ${this.captureContext.period}`,
      cls: "captura-clases-contexto",
    });

    const form = contentEl.createDiv({ cls: "captura-clases-formulario" });
    let customLabelField = null;
    let customLabelInput = null;

    const createField = ({
      label,
      description,
      value,
      placeholder,
      onInput,
    }) => {
      const field = form.createDiv({ cls: "captura-clases-campo" });
      field.createEl("label", { text: label });
      field.createEl("small", { text: description });
      const input = field.createEl("input", {
        attr: {
          type: "text",
          placeholder,
          autocomplete: "off",
          spellcheck: "false",
        },
      });
      input.value = value;
      input.addEventListener("input", () => onInput(input.value));
      return input;
    };

    const typeField = form.createDiv({ cls: "captura-clases-campo" });
    typeField.createEl("label", { text: "Tipo de apunte" });
    typeField.createEl("small", {
      text: "Selecciona o añade un tipo predeterminado.",
    });
    const typeButtons = typeField.createDiv({ cls: "captura-clases-opciones" });

    const renderTypeButtons = () => {
      typeButtons.empty();

      this.labelsList.forEach((option) => {
        const btn = typeButtons.createEl("button", {
          text: option,
          cls: `captura-clases-opcion${
            this.noteLabelKind === option ? " is-selected" : ""
          }`,
        });
        btn.addEventListener("click", (event) => {
          event.preventDefault();
          this.noteLabelKind = option;
          this.noteLabel = option;
          this.number = this.plugin.suggestNextNoteNumber(
            this.course,
            this.noteLabel
          );
          numberInput.value = this.number;
          renderTypeButtons();
          renderCustomLabelField();
        });
      });

      const btnOtro = typeButtons.createEl("button", {
        text: "Otro",
        cls: `captura-clases-opcion${
          this.noteLabelKind === "Otro" ? " is-selected" : ""
        }`,
      });
      btnOtro.addEventListener("click", (event) => {
        event.preventDefault();
        this.noteLabelKind = "Otro";
        this.noteLabel = normalizeNoteLabel(this.customNoteLabel);
        this.number = this.plugin.suggestNextNoteNumber(
          this.course,
          this.noteLabel
        );
        numberInput.value = this.number;
        renderTypeButtons();
        renderCustomLabelField();
      });
    };

    const renderCustomLabelField = () => {
      if (customLabelField) customLabelField.remove();
      customLabelField = null;
      customLabelInput = null;
      if (this.noteLabelKind !== "Otro") return;

      customLabelField = form.createDiv({ cls: "captura-clases-campo" });
      customLabelField.createEl("label", { text: "Nombre del apunte" });
      customLabelField.createEl("small", {
        text: "Ej. Taller, Laboratorio, Ayudantía, Control.",
      });
      customLabelInput = customLabelField.createEl("input", {
        attr: {
          type: "text",
          placeholder: "Ej. Taller",
          autocomplete: "off",
          spellcheck: "false",
          style: "width: 260px; max-width: 100%;"
        },
      });
      customLabelInput.value = this.customNoteLabel;
      customLabelInput.addEventListener("input", () => {
        this.customNoteLabel = customLabelInput.value;
        this.noteLabel = normalizeNoteLabel(this.customNoteLabel);
        this.number = this.plugin.suggestNextNoteNumber(
          this.course,
          this.noteLabel
        );
        numberInput.value = this.number;
      });

      const checkRow = customLabelField.createDiv({
        cls: "captura-clases-checkbox-row",
      });
      const checkbox = checkRow.createEl("input", {
        attr: { type: "checkbox", id: "guardar-predeterminado" },
      });
      checkbox.checked = this.saveCustomAsDefault;
      checkbox.addEventListener("change", () => {
        this.saveCustomAsDefault = checkbox.checked;
      });
      checkRow.createEl("label", {
        attr: { for: "guardar-predeterminado" },
        text: "Guardar este tipo como predeterminado para el futuro",
      });

      customLabelInput.addEventListener("keydown", submitOnEnter);
      window.setTimeout(() => customLabelInput.focus(), 20);
    };

    const topicInput = createField({
      label: "Nombre o tema (opcional)",
      description: "Tema específico del apunte.",
      value: this.topic,
      placeholder: "Ej. Introducción al curso",
      onInput: (value) => {
        this.topic = value;
      },
    });

    const numberInput = createField({
      label: "Número",
      description: "Correlativo automático por serie.",
      value: this.number,
      placeholder: "1",
      onInput: (value) => {
        this.number = value;
      },
    });

    const aiInput = createField({
      label: "IA usada (opcional)",
      description:
        "Si fue desarrollado con IA (ChatGPT, Claude, Gemini, etc.).",
      value: this.aiSource,
      placeholder: "Ej. Claude",
      onInput: (value) => {
        this.aiSource = value;
      },
    });

    const actions = contentEl.createDiv({ cls: "captura-clases-acciones" });
    const cancel = actions.createEl("button", { text: "Cancelar" });
    cancel.addEventListener("click", () => this.close());
    const create = actions.createEl("button", {
      text: "Crear apunte",
      cls: "mod-cta",
    });
    create.addEventListener("click", () => this.submit());

    const submitOnEnter = (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        this.submit();
      }
    };

    renderTypeButtons();
    renderCustomLabelField();
    topicInput.addEventListener("keydown", submitOnEnter);
    numberInput.addEventListener("keydown", submitOnEnter);
    aiInput.addEventListener("keydown", submitOnEnter);

    window.setTimeout(() => topicInput.focus(), 50);
  }

  promptAddNewDefaultLabel() {
    const name = window.prompt(
      "Escribe el nuevo tipo de apunte predeterminado (ej. Taller, Control, Laboratorio):"
    );
    if (!name || !name.trim()) return;
    const clean = normalizeNoteLabel(name);
    if (!this.labelsList.includes(clean)) {
      this.labelsList.push(clean);
      this.plugin.savePersistentNoteLabels(this.labelsList);
    }
    this.noteLabelKind = clean;
    this.noteLabel = clean;
    this.number = this.plugin.suggestNextNoteNumber(
      this.course,
      this.noteLabel
    );
    this.renderForm();
  }

  async submit() {
    const topic = sanitizeFilePart(this.topic);
    const number = sanitizeFilePart(this.number);
    const aiSource = normalizeAISource(this.aiSource);
    const noteLabel =
      this.noteLabelKind === "Otro"
        ? normalizeNoteLabel(this.customNoteLabel)
        : normalizeNoteLabel(this.noteLabelKind);

    if (!number || !/^[0-9]+(?:[.,-][0-9A-Za-z]+)?$/.test(number)) {
      new Notice("El número no es válido.", 5000);
      return;
    }
    if (this.noteLabelKind === "Otro" && !this.customNoteLabel.trim()) {
      new Notice("Escribe el nombre del apunte para usar Otro.", 5000);
      return;
    }

    if (this.saveCustomAsDefault && this.noteLabelKind === "Otro") {
      const clean = normalizeNoteLabel(this.customNoteLabel);
      if (!this.labelsList.includes(clean)) {
        this.labelsList.push(clean);
        await this.plugin.savePersistentNoteLabels(this.labelsList);
      }
    }

    this.close();
    try {
      await this.plugin.createClass({
        ...this.captureContext,
        targetLeaf: this.captureContext?.targetLeaf,
        course: this.course,
        topic,
        number,
        noteLabel,
        aiSource,
      });
    } catch (error) {
      console.error("Captura de clases:", error);
      new Notice(
        `No se pudo crear el apunte: ${error?.message || error}`,
        10000
      );
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ─── Modal Selección de Nota Paralela de IA ─────────────────────────────────

class ConnectAIModal extends Modal {
  constructor(plugin, currentFile, candidates, currentIsAI = false) {
    super(plugin.app);
    this.plugin = plugin;
    this.currentFile = currentFile;
    this.candidates = candidates;
    this.currentIsAI = currentIsAI;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("captura-clases-modal");
    contentEl.createEl("h2", {
      text: "Conectar con versión paralela de IA",
      cls: "modal-title",
    });
    contentEl.createEl("p", {
      text: `Nota actual: ${this.currentFile.basename}`,
      cls: "captura-clases-contexto",
    });

    const list = contentEl.createDiv({ cls: "captura-clases-ramos" });

    if (!this.candidates.length) {
      list.createEl("p", {
        text: "No se encontraron apuntes candidatos en la misma carpeta.",
        cls: "captura-clases-sin-resultados",
      });
    } else {
      this.candidates.forEach((cand) => {
        const btn = list.createEl("button", { cls: "captura-clases-ramo" });
        btn.createEl("strong", { text: cand.basename });
        btn.createEl("small", { text: cand.path });
        btn.addEventListener("click", async () => {
          this.close();
          if (this.currentIsAI) {
            await this.plugin.connectNotesBidirectional(cand, this.currentFile);
          } else {
            await this.plugin.connectNotesBidirectional(this.currentFile, cand);
          }
        });
      });
    }

    const actions = contentEl.createDiv({ cls: "captura-clases-acciones" });
    const cancel = actions.createEl("button", { text: "Cancelar" });
    cancel.addEventListener("click", () => this.close());
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ─── Modal Captura Rápida ───────────────────────────────────────────────────

class QuickCaptureModal extends Modal {
  constructor(plugin, targetFile) {
    super(plugin.app);
    this.plugin = plugin;
    this.targetFile = targetFile;
    this.kind = "nota";
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("captura-clases-modal");
    contentEl.createEl("h2", {
      text: "Captura rápida",
      cls: "modal-title",
    });
    contentEl.createEl("p", {
      text: `Destino: ${this.targetFile.basename}`,
      cls: "captura-clases-contexto",
    });

    const kindField = contentEl.createDiv({ cls: "captura-clases-campo" });
    kindField.createEl("label", { text: "Tipo de captura" });
    const kindButtons = kindField.createDiv({ cls: "captura-clases-opciones" });
    const kinds = [
      { id: "nota", label: "Nota" },
      { id: "duda", label: "Duda" },
      { id: "pendiente", label: "Pendiente" },
      { id: "importante", label: "Importante" },
    ];
    const renderKindButtons = () => {
      kindButtons.empty();
      kinds.forEach((kind) => {
        const btn = kindButtons.createEl("button", {
          text: kind.label,
          cls: `captura-clases-opcion${
            this.kind === kind.id ? " is-selected" : ""
          }`,
        });
        btn.addEventListener("click", (event) => {
          event.preventDefault();
          this.kind = kind.id;
          renderKindButtons();
        });
      });
    };
    renderKindButtons();

    const field = contentEl.createDiv({ cls: "captura-clases-campo" });
    field.createEl("label", { text: "Idea, duda o pendiente" });
    field.createEl("small", {
      text: "Se añadirá al apunte con la hora actual.",
    });
    const input = field.createEl("textarea", {
      cls: "captura-rapida-textarea",
      attr: {
        placeholder: "Ej. Preguntar por la demostración del teorema...",
        spellcheck: "true",
      },
    });

    const actions = contentEl.createDiv({ cls: "captura-clases-acciones" });
    const cancel = actions.createEl("button", { text: "Cancelar" });
    cancel.addEventListener("click", () => this.close());
    const save = actions.createEl("button", {
      text: "Guardar captura",
      cls: "mod-cta",
    });

    const submit = async () => {
      const text = input.value.trim();
      if (!text) {
        new Notice("Escribe algo para guardar la captura.", 4000);
        return;
      }
      save.disabled = true;
      await this.plugin.appendQuickCapture(this.targetFile, text, this.kind);
      this.close();
    };

    save.addEventListener("click", submit);
    input.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        submit();
      }
    });
    window.setTimeout(() => input.focus(), 50);
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ─── Modales del Panel de Control Universitario ─────────────────────────────

class CreateSemesterModal extends Modal {
  constructor(plugin, onCreated) {
    super(plugin.app);
    this.plugin = plugin;
    this.onCreated = onCreated;
    const now = moment();
    this.year = now.year();
    this.periodNum = now.month() >= 6 ? 2 : 1;
    this.startDate =
      this.periodNum === 1 ? `${this.year}-03-01` : `${this.year}-08-01`;
    this.endDate =
      this.periodNum === 1 ? `${this.year}-07-15` : `${this.year}-12-15`;
    this.setAsActive = true;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("captura-clases-modal");
    contentEl.createEl("h2", { text: "Crear nuevo semestre", cls: "modal-title" });
    contentEl.createEl("p", {
      text: "Crea la estructura del semestre con carpeta de cursos y plantilla de horario.",
      cls: "captura-clases-contexto",
    });

    const form = contentEl.createDiv({ cls: "captura-clases-formulario" });

    new Setting(form).setName("Año").addText((t) => {
      t.setValue(String(this.year));
      t.onChange((v) => {
        this.year = Number(v) || this.year;
        updateDates();
      });
    });

    new Setting(form).setName("Periodo").addDropdown((d) => {
      d.addOption("1", "Primer semestre (1)");
      d.addOption("2", "Segundo semestre (2)");
      d.setValue(String(this.periodNum));
      d.onChange((v) => {
        this.periodNum = Number(v);
        updateDates();
      });
    });

    let startText = null;
    let endText = null;

    new Setting(form).setName("Fecha de inicio").addText((t) => {
      startText = t;
      t.setValue(this.startDate);
      t.onChange((v) => (this.startDate = v));
    });

    new Setting(form).setName("Fecha de fin").addText((t) => {
      endText = t;
      t.setValue(this.endDate);
      t.onChange((v) => (this.endDate = v));
    });

    const updateDates = () => {
      this.startDate =
        this.periodNum === 1 ? `${this.year}-03-01` : `${this.year}-08-01`;
      this.endDate =
        this.periodNum === 1 ? `${this.year}-07-15` : `${this.year}-12-15`;
      if (startText) startText.setValue(this.startDate);
      if (endText) endText.setValue(this.endDate);
    };

    new Setting(form)
      .setName("Establecer como semestre activo")
      .addToggle((tg) => {
        tg.setValue(this.setAsActive);
        tg.onChange((v) => (this.setAsActive = v));
      });

    const actions = contentEl.createDiv({ cls: "captura-clases-acciones" });
    const cancel = actions.createEl("button", { text: "Cancelar" });
    cancel.addEventListener("click", () => this.close());
    const save = actions.createEl("button", {
      text: "Crear semestre",
      cls: "mod-cta",
    });
    save.addEventListener("click", async () => {
      const period = `${this.year}-${this.periodNum}`;
      await this.plugin.createSemesterStructure({
        period,
        startDate: this.startDate,
        endDate: this.endDate,
        setAsActive: this.setAsActive,
      });
      this.close();
      if (this.onCreated) this.onCreated(period);
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

class CreateCourseModal extends Modal {
  constructor(plugin, defaultPeriod, onCreated) {
    super(plugin.app);
    this.plugin = plugin;
    this.period = defaultPeriod || plugin.activePeriod() || "2026-2";
    this.name = "";
    this.professor = "";
    this.siglaRamo = "";
    this.siglaProfesor = "";
    this.prefix = "";
    this.onCreated = onCreated;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("captura-clases-modal");
    contentEl.createEl("h2", { text: "Añadir nuevo ramo", cls: "modal-title" });
    contentEl.createEl("p", {
      text: `Semestre: ${this.period}`,
      cls: "captura-clases-contexto",
    });

    const form = contentEl.createDiv({ cls: "captura-clases-formulario" });

    const updatePrefix = () => {
      if (this.siglaRamo && this.siglaProfesor) {
        this.prefix = `${this.siglaRamo}-${this.siglaProfesor}`;
      } else if (this.siglaRamo) {
        this.prefix = this.siglaRamo;
      }
      if (prefixInput) prefixInput.setValue(this.prefix);
    };

    new Setting(form).setName("Nombre del ramo").addText((t) => {
      t.setPlaceholder("Ej. Econometría I");
      t.onChange((v) => {
        this.name = v;
        if (!this.siglaRamo) {
          const words = v.split(/\s+/).filter(Boolean);
          this.siglaRamo = words.map((w) => w[0]?.toUpperCase()).join("").slice(0, 3);
          updatePrefix();
        }
      });
    });

    new Setting(form).setName("Nombre del profesor").addText((t) => {
      t.setPlaceholder("Ej. Rodrigo Fuentes");
      t.onChange((v) => {
        this.professor = v;
        if (!this.siglaProfesor) {
          const words = v.split(/\s+/).filter(Boolean);
          this.siglaProfesor = words.map((w) => w[0]?.toUpperCase()).join("").slice(0, 2);
          updatePrefix();
        }
      });
    });

    new Setting(form).setName("Sigla del ramo").addText((t) => {
      t.setPlaceholder("Ej. ECO");
      t.onChange((v) => {
        this.siglaRamo = v.toUpperCase();
        updatePrefix();
      });
    });

    new Setting(form).setName("Sigla del profesor").addText((t) => {
      t.setPlaceholder("Ej. RF");
      t.onChange((v) => {
        this.siglaProfesor = v.toUpperCase();
        updatePrefix();
      });
    });

    let prefixInput = null;
    new Setting(form)
      .setName("Prefijo de apuntes")
      .setDesc("Se antepone al nombre de cada apunte: (PREFIJO) Clase 1")
      .addText((t) => {
        prefixInput = t;
        t.setValue(this.prefix);
        t.onChange((v) => (this.prefix = v));
      });

    const actions = contentEl.createDiv({ cls: "captura-clases-acciones" });
    const cancel = actions.createEl("button", { text: "Cancelar" });
    cancel.addEventListener("click", () => this.close());
    const save = actions.createEl("button", {
      text: "Crear ramo",
      cls: "mod-cta",
    });
    save.addEventListener("click", async () => {
      if (!this.name.trim() || !this.professor.trim() || !this.prefix.trim()) {
        new Notice("Por favor completa el nombre, profesor y prefijo.", 5000);
        return;
      }
      await this.plugin.createCourseStructure({
        period: this.period,
        name: this.name.trim(),
        professor: this.professor.trim(),
        siglaRamo: this.siglaRamo.trim(),
        siglaProfesor: this.siglaProfesor.trim(),
        prefix: this.prefix.trim(),
      });
      this.close();
      if (this.onCreated) this.onCreated();
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ─── Pestaña de Ajustes / Dashboard Universitario ───────────────────────────

class UniversitySettingsTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.selectedPeriod = plugin.activePeriod() || "2026-2";
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("captura-clases-settings-dashboard");

    containerEl.createEl("h1", {
      text: "Gestor Universitario",
      cls: "captura-dashboard-title",
    });
    containerEl.createEl("p", {
      text: "Administra semestres, ramos, tipos de apunte y sincronización de toda la bóveda.",
      cls: "captura-dashboard-subtitle",
    });

    new Setting(containerEl)
      .setName("Confirmar antes de crear una nota diaria")
      .setDesc("Cuando abras un día sin nota desde el calendario, Unique pedirá confirmación antes de crearla.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.shouldConfirmBeforeCreateDaily !== false)
          .onChange(async (value) => {
            this.plugin.settings.shouldConfirmBeforeCreateDaily = value;
            await this.plugin.saveData(this.plugin.settings);
          });
      });

    // ── 1. SEMESTRES ──
    const semHeader = containerEl.createDiv({
      cls: "captura-dashboard-section-header",
    });
    semHeader.createEl("h2", { text: "Semestres" });
    const btnNewSem = semHeader.createEl("button", {
      text: "+ Crear Semestre",
      cls: "mod-cta",
    });
    btnNewSem.addEventListener("click", () => {
      new CreateSemesterModal(this.plugin, (period) => {
        this.selectedPeriod = period;
        this.display();
      }).open();
    });

    const semestersList = containerEl.createDiv({
      cls: "captura-dashboard-grid",
    });
    const semesters = this.plugin.getAllSemesters();

    semesters.forEach((sem) => {
      const card = semestersList.createDiv({
        cls: `captura-dashboard-card${
          sem.estado === "activo" ? " is-active" : ""
        }`,
      });
      const topRow = card.createDiv({ cls: "captura-dashboard-card-top" });
      topRow.createEl("h3", { text: `Semestre ${sem.periodo}` });
      topRow.createEl("span", {
        cls: `captura-badge${sem.estado === "activo" ? " is-active" : ""}`,
        text: sem.estado === "activo" ? "● Activo" : "Archivado",
      });

      card.createEl("p", {
        text: `${sem.inicio || "Sin fecha"} → ${sem.fin || "Sin fecha"}`,
        cls: "captura-card-date",
      });

      const coursesCount = this.plugin.getCourses(sem.periodo).length;
      card.createEl("small", {
        text: `${coursesCount} ${coursesCount === 1 ? "ramo" : "ramos"}`,
      });

      const cardActions = card.createDiv({
        cls: "captura-dashboard-card-actions",
      });

      if (sem.estado !== "activo") {
        const btnActivar = cardActions.createEl("button", {
          text: "Activar",
          cls: "btn-sm",
        });
        btnActivar.addEventListener("click", async () => {
          await this.plugin.setActiveSemester(sem.periodo);
          this.selectedPeriod = sem.periodo;
          this.display();
        });
      }

      const btnHorario = cardActions.createEl("button", {
        text: "Horario",
        cls: "btn-sm",
      });
      btnHorario.addEventListener("click", () => {
        const hFile = this.plugin.getScheduleFile(sem.periodo);
        if (hFile) this.plugin.openForWriting(hFile);
        else new Notice("No se encontró el archivo de horario.", 4000);
      });
    });

    // ── 2. RAMOS DEL SEMESTRE ──
    const ramoHeader = containerEl.createDiv({
      cls: "captura-dashboard-section-header",
    });
    ramoHeader.createEl("h2", { text: "Ramos" });

    const ramoControls = ramoHeader.createDiv({ cls: "captura-header-controls" });
    const semSelect = ramoControls.createEl("select", {
      cls: "dropdown captura-sem-select",
    });
    semesters.forEach((s) => {
      const opt = semSelect.createEl("option", {
        text: `Semestre ${s.periodo}${s.estado === "activo" ? " (Activo)" : ""}`,
        value: s.periodo,
      });
      if (s.periodo === this.selectedPeriod) opt.selected = true;
    });
    semSelect.addEventListener("change", () => {
      this.selectedPeriod = semSelect.value;
      this.display();
    });

    const btnNewRamo = ramoControls.createEl("button", {
      text: "+ Añadir Ramo",
      cls: "mod-cta",
    });
    btnNewRamo.addEventListener("click", () => {
      new CreateCourseModal(this.plugin, this.selectedPeriod, () => {
        this.display();
      }).open();
    });

    const courses = this.plugin.getCourses(this.selectedPeriod);
    const coursesGrid = containerEl.createDiv({
      cls: "captura-dashboard-courses-grid",
    });

    if (!courses.length) {
      coursesGrid.createEl("p", {
        text: `No hay ramos configurados para el semestre ${this.selectedPeriod}.`,
        cls: "captura-clases-sin-resultados",
      });
    } else {
      courses.forEach((c) => {
        const card = coursesGrid.createDiv({
          cls: "captura-dashboard-course-card",
        });
        const cHead = card.createDiv({ cls: "captura-course-head" });
        cHead.createEl("strong", { text: c.name });
        cHead.createEl("span", {
          text: c.prefix,
          cls: "captura-prefix-badge",
        });

        card.createEl("p", {
          text: `Prof. ${c.professor}`,
          cls: "captura-course-prof",
        });

        const notesCount =
          c.folder.children.filter(
            (f) => f instanceof TFile && f.extension === "md"
          ).length - 1;
        card.createEl("small", {
          text: `${Math.max(0, notesCount)} apuntes registrados`,
        });

        const cActions = card.createDiv({
          cls: "captura-dashboard-card-actions",
        });
        const btnIndex = cActions.createEl("button", {
          text: "Abrir Índice",
          cls: "btn-sm",
        });
        btnIndex.addEventListener("click", () => {
          this.plugin.openForWriting(c.index);
        });
      });
    }

    // ── 3. TIPOS DE APUNTE PREDETERMINADOS ──
    containerEl.createDiv({ cls: "captura-dashboard-divider" });
    const typesHeader = containerEl.createDiv({
      cls: "captura-dashboard-section-header",
    });
    typesHeader.createEl("h2", { text: "Tipos de Apunte Predeterminados" });

    const typesContainer = containerEl.createDiv({
      cls: "captura-types-container",
    });
    this.renderTypesManager(typesContainer);

    // ── 4. HERRAMIENTAS Y MANTENIMIENTO ──
    containerEl.createDiv({ cls: "captura-dashboard-divider" });
    containerEl.createEl("h2", {
      text: "Mantenimiento y Sincronización",
    });

    new Setting(containerEl)
      .setName("Reparar y sincronizar toda la bóveda")
      .setDesc(
        "Revisa todos los semestres, normaliza etiquetas de propiedades, conecta versiones de IA y actualiza todos los índices."
      )
      .addButton((b) => {
        b.setButtonText("Reparar Bóveda");
        b.setCta();
        b.onClick(async () => {
          b.setDisabled(true);
          b.setButtonText("Procesando…");
          await this.plugin.repairAndSyncVault();
          b.setDisabled(false);
          b.setButtonText("Reparar Bóveda");
          this.display();
        });
      });

    new Setting(containerEl)
      .setName("Limpiar notas diarias vacías")
      .setDesc("Elimina archivos diarios que no tengan ningún apunte ni texto.")
      .addButton((b) => {
        b.setButtonText("Limpiar Diarios");
        b.onClick(async () => {
          const removed = await this.plugin.cleanEmptyDailyNotes();
          new Notice(
            `Limpieza completa: ${removed} notas diarias vacías eliminadas.`,
            6000
          );
        });
      });

    new Setting(containerEl)
      .setName("Revisar recordatorios ahora")
      .setDesc("Comprueba Sistema/Recordatorios.md sin esperar al ciclo automático.")
      .addButton((b) => {
        b.setButtonText("Revisar");
        b.onClick(async () => {
          b.setDisabled(true);
          await this.plugin.checkRecordatoriosNow();
          b.setDisabled(false);
        });
      });

    new Setting(containerEl)
      .setName("Preparar esta bóveda")
      .setDesc("Crea carpetas y archivos base si faltan, útil al instalar el sistema en otro PC.")
      .addButton((b) => {
        b.setButtonText("Preparar");
        b.onClick(async () => {
          b.setDisabled(true);
          await this.plugin.ensureVaultReady({ quiet: false });
          b.setDisabled(false);
          this.display();
        });
      });
  }

  async renderTypesManager(container) {
    container.empty();
    const labels = await this.plugin.getPersistentNoteLabels();

    const chips = container.createDiv({ cls: "captura-labels-chips" });
    labels.forEach((label) => {
      const chip = chips.createDiv({ cls: "captura-label-chip" });
      chip.createSpan({ text: label });
      const del = chip.createSpan({ text: "×", cls: "captura-chip-del" });
      del.addEventListener("click", async () => {
        const updated = labels.filter((l) => l !== label);
        await this.plugin.savePersistentNoteLabels(updated);
        this.renderTypesManager(container);
      });
    });

    const addRow = container.createDiv({ cls: "captura-label-add-row" });
    const input = addRow.createEl("input", {
      attr: {
        type: "text",
        placeholder: "Nuevo tipo (ej. Control, Taller, Laboratorio)",
      },
    });
    const addBtn = addRow.createEl("button", {
      text: "+ Añadir",
      cls: "mod-cta",
    });

    const doAdd = async () => {
      const val = normalizeNoteLabel(input.value);
      if (!val || labels.includes(val)) return;
      labels.push(val);
      await this.plugin.savePersistentNoteLabels(labels);
      input.value = "";
      this.renderTypesManager(container);
    };

    addBtn.addEventListener("click", doAdd);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doAdd();
    });
  }
}

// ─── Modal Dashboard Directo ────────────────────────────────────────────────

class DashboardModal extends Modal {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
  }

  onOpen() {
    this.contentEl.addClass("captura-dashboard-modal");
    const tab = new UniversitySettingsTab(this.app, this.plugin);
    tab.containerEl = this.contentEl;
    tab.display();
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ─── Vista Inicio Unificada ─────────────────────────────────────────────────

function relativeDate(mtime) {
  const diff = Date.now() - mtime;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `${minutes} min`;
  if (hours < 24) return `${hours} h`;
  if (days === 1) return "Ayer";
  if (days < 7) return `${days} d`;
  if (days < 30) return `${Math.floor(days / 7)} sem`;
  return moment(mtime).locale("es").format("D MMM");
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function todayLabel() {
  const raw = moment().locale("es").format("dddd, D [de] MMMM [de] YYYY");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function noteTypeInfo(file, app) {
  const fm = app.metadataCache.getFileCache(file)?.frontmatter || {};
  const tipo = String(fm.tipo || "").toLowerCase();
  const cssClasses = Array.isArray(fm.cssclasses) ? fm.cssclasses : [];
  if (
    (tipo === "clase" || cssClasses.includes("apunte") || fm.etiqueta_apunte) &&
    tipo !== "indice-ramo" &&
    tipo !== "semestre"
  ) {
    const label = String(fm.etiqueta_apunte || noteLabelFrom(file, fm));
    return { kind: "clase", label, icon: "notebook-pen" };
  }
  if (tipo === "diario" || file.path.startsWith("Diario/")) {
    return { kind: "diario", label: "Diario", icon: "calendar" };
  }
  if (tipo === "indice-ramo") return { kind: "indice", label: "Índice", icon: "folder" };
  if (tipo === "semestre") return { kind: "indice", label: "Semestre", icon: "graduation-cap" };
  return { kind: "nota", label: "Nota", icon: "file-text" };
}

class UniqueHomeView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.results = [];
    this.selectedIndex = 0;
    this.activeFilter = plugin.settings?.activeFilter || "todos";
  }

  getViewType() {
    return VIEW_TYPE_HOME;
  }

  getDisplayText() {
    return "Inicio";
  }

  getIcon() {
    return "home";
  }

  async onOpen() {
    this.render();
  }

  async onClose() {
    this.contentEl.empty();
  }

  async openFile(file) {
    if (!(file instanceof TFile)) return;
    await this.leaf.openFile(file, { state: { mode: "source" } });
    this.app.workspace.setActiveLeaf(this.leaf, { focus: true });
  }

  getRecentFiles(limit = 6) {
    // Scoped to Diario/Semestres/Sistema — avoids whole-vault enumeration on home open.
    const all = [...getScopedMarkdownFiles(this.app, UNIQUE_SCOPE_FOLDERS)].sort(
      (a, b) => b.stat.mtime - a.stat.mtime
    );
    return all
      .filter((file) => {
        const fm = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
        const tipo = String(fm.tipo || "").toLowerCase();
        const cssClasses = Array.isArray(fm.cssclasses) ? fm.cssclasses : [];
        if (this.activeFilter === "apuntes") {
          if (tipo === "indice-ramo" || tipo === "semestre" || tipo === "diario") {
            return false;
          }
          if (file.path.startsWith("Diario/")) return false;
          return tipo === "clase" || cssClasses.includes("apunte") || !!fm.etiqueta_apunte;
        }
        if (this.activeFilter === "diarios") return tipo === "diario" || file.path.startsWith("Diario/");
        if (this.activeFilter === "indices") return tipo === "indice-ramo" || tipo === "semestre";
        return true;
      })
      .slice(0, limit);
  }

  createAction(container, icon, label, onClick, primary = false) {
    const btn = container.createEl("button", {
      cls: `inicio-accion-btn${primary ? " inicio-accion-btn--primary" : ""}`,
    });
    const iconEl = btn.createSpan({ cls: "inicio-accion-btn-icon" });
    setIcon(iconEl, icon);
    btn.createSpan({ text: label });
    btn.addEventListener("click", onClick);
    return btn;
  }

  async render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("inicio-personalizado");

    const period = this.plugin.activePeriod();
    const courses = this.plugin.getCourses(period);
    const shell = contentEl.createDiv({ cls: "inicio-personalizado-shell" });

    const heading = shell.createDiv({ cls: "inicio-personalizado-heading" });
    heading.createEl("h1", { text: greeting(), cls: "inicio-saludo" });
    heading.createEl("p", { text: todayLabel(), cls: "inicio-personalizado-subtitle" });

    const searchWrap = shell.createDiv({ cls: "inicio-busqueda-wrap" });
    const searchBar = searchWrap.createDiv({ cls: "inicio-busqueda-bar" });
    const searchIconEl = searchBar.createSpan({ cls: "inicio-busqueda-icon" });
    setIcon(searchIconEl, "search");
    const search = searchBar.createEl("input", {
      cls: "inicio-busqueda",
      attr: {
        type: "search",
        placeholder: "Buscar notas o apuntes...",
        autocomplete: "off",
        spellcheck: "false",
        "aria-label": "Buscar notas o apuntes",
      },
    });

    const filtersWrap = searchWrap.createDiv({ cls: "inicio-filtros-wrap" });
    const filterOptions = [
      { id: "todos", label: "Todo" },
      { id: "apuntes", label: "Apuntes" },
      { id: "diarios", label: "Diario" },
      { id: "indices", label: "Índices" },
    ];
    filterOptions.forEach((opt) => {
      const filterBtn = filtersWrap.createEl("button", {
        cls: `inicio-filtro-btn${this.activeFilter === opt.id ? " is-active" : ""}`,
        text: opt.label,
      });
      filterBtn.addEventListener("click", async () => {
        this.activeFilter = opt.id;
        this.plugin.settings.activeFilter = opt.id;
        await this.plugin.saveData(this.plugin.settings);
        renderRecent();
        this.render();
      });
    });

    const resultsEl = shell.createDiv({ cls: "inicio-resultados" });
    const actionsRow = shell.createDiv({ cls: "inicio-acciones-row" });
    this.createAction(actionsRow, "notebook-pen", "Nuevo apunte", () => this.plugin.startClassCapture(), true);
    this.createAction(actionsRow, "zap", "Captura rápida", () => this.plugin.openQuickCapture(), true);
    this.createAction(actionsRow, "calendar-days", "Calendario", () => this.app.commands.executeCommandById((this.manifest && this.manifest.id ? this.manifest.id : "unique") + ":abrir"));
    this.createAction(actionsRow, "calendar", "Diario de hoy", () => this.plugin.openDate(moment().format("YYYY-MM-DD")));
    this.createAction(actionsRow, "history", "Último apunte", () => this.plugin.reopenLastClass());
    this.createAction(actionsRow, "layout-dashboard", "Panel", () => new DashboardModal(this.plugin).open());

    if (!period || courses.length === 0) {
      this.createAction(actionsRow, "wand-sparkles", "Preparar bóveda", async () => {
        await this.plugin.ensureVaultReady({ quiet: false });
        this.render();
      });
    }

    if (courses.length) {
      const coursesSection = shell.createDiv({ cls: "inicio-seccion" });
      const coursesHeader = coursesSection.createDiv({ cls: "inicio-seccion-header" });
      coursesHeader.createDiv({ cls: "inicio-seccion-titulo", text: `Ramos ${period}` });
      const coursesGrid = coursesSection.createDiv({ cls: "inicio-ramos-grid" });
      courses.forEach((course) => {
        const chip = coursesGrid.createEl("button", { cls: "inicio-ramo-chip" });
        const iconEl = chip.createSpan({ cls: "inicio-ramo-chip-icon" });
        setIcon(iconEl, "book-open");
        chip.createSpan({
          cls: "inicio-ramo-chip-text",
          text: course.prefix ? `(${course.prefix}) ${course.name}` : course.name,
        });
        chip.addEventListener("click", () => this.openFile(course.index));
      });
    }

    const recentSection = shell.createDiv({ cls: "inicio-seccion" });
    const recentHeader = recentSection.createDiv({ cls: "inicio-seccion-header" });
    recentHeader.createDiv({ cls: "inicio-seccion-titulo", text: "Recientes" });
    const recentEl = recentSection.createDiv({ cls: "inicio-recientes" });

    const createNoteItem = (container, file, isSearchResult = false) => {
      const btn = container.createEl("button", {
        cls: isSearchResult ? "inicio-resultado" : "inicio-nota",
      });
      const typeInfo = noteTypeInfo(file, this.app);
      const iconWrap = btn.createSpan({ cls: "inicio-item-icon" });
      setIcon(iconWrap, typeInfo.icon || "file-text");
      const info = btn.createDiv({ cls: "inicio-nota-info" });
      info.createEl("span", { text: file.basename, cls: "inicio-item-title" });
      const meta = info.createDiv({ cls: "inicio-nota-meta" });
      meta.createSpan({
        cls: `inicio-item-tag inicio-tag--${typeInfo.kind}`,
        text: typeInfo.label,
      });
      if (file.parent?.path) {
        meta.createSpan({ cls: "inicio-item-folder", text: file.parent.path });
      }
      const rightMeta = btn.createDiv({ cls: "inicio-item-right" });
      rightMeta.createSpan({ cls: "inicio-item-fecha", text: relativeDate(file.stat.mtime) });
      btn.addEventListener("click", () => this.openFile(file));
      return btn;
    };

    const renderResults = () => {
      const query = normalizeSearch(search.value);
      resultsEl.empty();
      if (!query) {
        resultsEl.removeClass("is-visible");
        return;
      }
      // User-triggered search; still scoped to university folders.
      const files = getScopedMarkdownFiles(this.app, UNIQUE_SCOPE_FOLDERS)
        .map((file) => {
          const name = normalizeSearch(file.basename);
          const path = normalizeSearch(file.path);
          let score = 0;
          if (name === query) score = 100;
          else if (name.startsWith(query)) score = 80;
          else if (name.includes(query)) score = 60;
          else if (path.includes(query)) score = 30;
          return { file, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || b.file.stat.mtime - a.file.stat.mtime)
        .slice(0, 8);
      this.results = files.map((item) => item.file);
      resultsEl.addClass("is-visible");
      if (!this.results.length) {
        resultsEl.createDiv({ text: "No se encontraron notas.", cls: "inicio-sin-resultados" });
        return;
      }
      this.results.forEach((file) => createNoteItem(resultsEl, file, true));
    };

    const renderRecent = () => {
      recentEl.empty();
      const files = this.getRecentFiles(6);
      if (!files.length) {
        recentEl.createDiv({ text: "No hay notas recientes.", cls: "inicio-vacio" });
        return;
      }
      files.forEach((file) => createNoteItem(recentEl, file));
    };

    search.addEventListener("input", renderResults);
    search.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && this.results[0]) {
        event.preventDefault();
        this.openFile(this.results[0]);
      } else if (event.key === "Escape") {
        search.value = "";
        renderResults();
      }
    });
    renderRecent();
    window.setTimeout(() => search.focus(), 50);
  }
}

// ─── Calendario Propio ──────────────────────────────────────────────────────

class ConfirmCreateDailyNoteModal extends Modal {
  constructor(plugin, date, onAccept) {
    super(plugin.app);
    this.plugin = plugin;
    this.date = date;
    this.onAccept = onAccept;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    const filename = moment(this.date, "YYYY-MM-DD").format("YYYY-MM-DD");
    const readableDate = moment(this.date, "YYYY-MM-DD")
      .locale("es")
      .format("dddd D [de] MMMM [de] YYYY");
    contentEl.createEl("h2", { text: "Nueva nota diaria" });
    contentEl.createEl("p", {
      text: `La nota ${filename} no existe. ¿Quieres crear la nota para ${readableDate}?`,
    });
    const buttons = contentEl.createDiv({ cls: "modal-button-container" });
    buttons
      .createEl("button", { text: "Cancelar" })
      .addEventListener("click", () => this.close());
    buttons
      .createEl("button", { cls: "mod-cta", text: "Crear" })
      .addEventListener("click", async () => {
        await this.onAccept();
        this.close();
      });
  }
}

function buildUniqueOriginalCalendarView(BaseCalendarView, activeFileStore) {
  return class UniqueOriginalCalendarView extends BaseCalendarView {
    constructor(leaf, plugin) {
      super(leaf);
      this.uniquePlugin = plugin;
    }

    getDisplayText() {
      return "Calendario";
    }

    async openOrCreateDailyNote(date) {
      const key = date.format("YYYY-MM-DD");
      const existing = this.uniquePlugin.getDailyFile(key);
      const openFile = async (file) => {
        await this.uniquePlugin.openForWriting(
          file,
          this.uniquePlugin.getMainContentLeaf()
        );
        activeFileStore?.setFile?.(file);
        this.calendar?.tick?.();
      };
      if (existing instanceof TFile) {
        await openFile(existing);
        return;
      }
      const createAndOpen = async () => {
        const file = await this.uniquePlugin.createDailyFile(key);
        await openFile(file);
      };
      if (this.uniquePlugin.settings.shouldConfirmBeforeCreateDaily !== false) {
        new ConfirmCreateDailyNoteModal(this.uniquePlugin, key, createAndOpen).open();
        return;
      }
      await createAndOpen();
    }
  };
}

class UniqueCalendarView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.displayedMonth = moment().startOf("month");
    this.selectedId = null;
    this.linkedId = null;
    this.renderToken = 0;
  }

  getViewType() {
    return VIEW_TYPE_CALENDAR;
  }

  getDisplayText() {
    return "Calendario";
  }

  getIcon() {
    return "calendar-with-checkmark";
  }

  async onOpen() {
    await this.updateActiveContext(false);
    this.render();
    window.setTimeout(() => this.plugin.pruneDuplicateCalendarViews(this.leaf), 0);
    this.registerEvent(this.app.vault.on("create", () => this.render()));
    this.registerEvent(this.app.vault.on("delete", () => this.render()));
    this.registerEvent(this.app.vault.on("modify", () => this.render()));
    this.registerEvent(
      this.app.workspace.on("file-open", () => this.updateActiveContext(true))
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => this.updateActiveContext(true))
    );
  }

  async onClose() {
    this.contentEl.empty();
  }

  async getDailyInfo() {
    const info = new Map();
    const diarioFiles = getScopedMarkdownFiles(this.app, ["Diario"]);
    const scopedFiles = getScopedMarkdownFiles(this.app, ["Diario", "Semestres"]);
    for (const file of diarioFiles) {
      if (this.plugin.isDailyFile(file)) {
        info.set(file.basename, { file, words: 0, tasks: 0, classes: 0 });
      }
    }
    for (const file of scopedFiles) {
      const fm = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
      const date = String(fm.fecha || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (!info.has(date)) info.set(date, { file: null, words: 0, tasks: 0, classes: 0 });
      const entry = info.get(date);
      if (String(fm.tipo || "").toLowerCase() === "clase" || fm.etiqueta_apunte) {
        entry.classes += 1;
      }
    }
    for (const [date, entry] of info.entries()) {
      if (!entry.file) continue;
      try {
        const content = await this.app.vault.cachedRead(entry.file);
        entry.words = content.split(/\s+/).filter(Boolean).length;
        entry.tasks = (content.match(/^- \[[ xX]\]/gm) || []).length;
      } catch (error) {
        console.warn(`Unique: no se pudo leer la nota diaria ${date}`, error);
      }
    }
    return info;
  }

  async getFileDate(file) {
    if (!(file instanceof TFile) || file.extension !== "md") return "";
    if (this.plugin.isDailyFile(file)) return file.basename;
    const cached = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
    const cachedDate = String(cached.fecha || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(cachedDate)) return cachedDate;
    try {
      const content = await this.app.vault.cachedRead(file);
      const parsedDate = String(frontmatterScalar(content, "fecha") || "");
      return /^\d{4}-\d{2}-\d{2}$/.test(parsedDate) ? parsedDate : "";
    } catch (error) {
      console.warn(`Unique: no se pudo detectar la fecha activa de ${file.path}`, error);
      return "";
    }
  }

  async updateActiveContext(shouldRender = true) {
    const file = this.app.workspace.getActiveFile();
    const date = await this.getFileDate(file);
    if (!date) {
      this.selectedId = null;
      this.linkedId = null;
      if (shouldRender) this.render();
      return;
    }
    if (this.plugin.isDailyFile(file)) {
      this.selectedId = date;
      this.linkedId = null;
    } else {
      this.selectedId = null;
      this.linkedId = date;
    }
    this.displayedMonth = moment(date, "YYYY-MM-DD").startOf("month");
    if (shouldRender) this.render();
  }

  getCalendarMonth() {
    const month = [];
    const first = this.displayedMonth.clone().date(1);
    let date = first.clone().subtract(first.weekday(), "days");
    for (let i = 0; i < 42; i += 1) {
      if (i % 7 === 0) month.push({ days: [], weekNum: date.week() });
      month[month.length - 1].days.push(date);
      date = date.clone().add(1, "days");
    }
    return month;
  }

  getDots(info) {
    if (!info) return [];
    const dots = [];
    if (info.file) dots.push({ cls: "dot filled svelte-1widvzq", title: "Nota diaria" });
    if (info.tasks) dots.push({ cls: "dot hollow task svelte-1widvzq", title: "Tiene tareas" });
    return dots.slice(0, 6);
  }

  createDot(parent, dot) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", dot.cls);
    svg.setAttribute("viewBox", "0 0 6 6");
    svg.setAttribute("aria-label", dot.title);
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "3");
    circle.setAttribute("cy", "3");
    circle.setAttribute("r", "2.35");
    svg.appendChild(circle);
    parent.appendChild(svg);
  }

  async render() {
    const token = ++this.renderToken;
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("unique-calendar-view-legacy");
    const today = moment().format("YYYY-MM-DD");
    const dailyInfo = await this.getDailyInfo();
    if (token !== this.renderToken) return;
    contentEl.empty();
    contentEl.addClass("unique-calendar-view-legacy");
    const container = contentEl.createDiv({ cls: "container svelte-pcimu8", attr: { id: "calendar-container" } });

    const nav = container.createDiv({ cls: "nav svelte-1vwr9dd" });
    const title = nav.createEl("h3", { cls: "title svelte-1vwr9dd" });
    title.createSpan({
      cls: "month svelte-1vwr9dd",
      text: this.displayedMonth.clone().locale("es").format("MMM"),
    });
    title.appendText(" ");
    title.createSpan({
      cls: "year svelte-1vwr9dd",
      text: this.displayedMonth.format("YYYY"),
    });
    const rightNav = nav.createDiv({ cls: "right-nav svelte-1vwr9dd" });
    const reset = rightNav.createDiv({ cls: "reset-button svelte-1vwr9dd", text: "Hoy" });
    const prev = rightNav.createEl("button", { cls: "clickable-icon unique-calendar-arrow", attr: { "aria-label": "Mes anterior" } });
    setIcon(prev, "chevron-left");
    const next = rightNav.createEl("button", { cls: "clickable-icon unique-calendar-arrow", attr: { "aria-label": "Mes siguiente" } });
    setIcon(next, "chevron-right");

    reset.addEventListener("click", () => {
      this.displayedMonth = moment().startOf("month");
      this.render();
    });
    prev.addEventListener("click", () => {
      this.displayedMonth = this.displayedMonth.clone().subtract(1, "month");
      this.render();
    });
    next.addEventListener("click", () => {
      this.displayedMonth = this.displayedMonth.clone().add(1, "month");
      this.render();
    });

    const table = container.createEl("table", { cls: "calendar svelte-pcimu8" });
    const head = table.createEl("thead");
    const headRow = head.createEl("tr");
    moment.weekdaysShort(true).forEach((weekday) => {
      headRow.createEl("th", { cls: "svelte-pcimu8", text: weekday });
    });

    const body = table.createEl("tbody");
    for (const week of this.getCalendarMonth()) {
      const row = body.createEl("tr");
      for (const date of week.days) {
        const key = date.format("YYYY-MM-DD");
        const td = row.createEl("td", { cls: date.isoWeekday() >= 6 ? "weekend svelte-pcimu8" : "svelte-pcimu8" });
        const classes = ["day", "svelte-q3wqg9"];
        if (!date.isSame(this.displayedMonth, "month")) classes.push("adjacent-month");
        if (key === today) classes.push("today");
        if (key === this.selectedId) classes.push("active");
        if (key === this.linkedId && key !== this.selectedId) classes.push("linked-active");
        const day = td.createDiv({ cls: classes.join(" "), text: String(date.date()) });
        const dots = day.createDiv({ cls: "dot-container svelte-q3wqg9" });
        for (const dot of this.getDots(dailyInfo.get(key))) this.createDot(dots, dot);
        day.addEventListener("click", async () => {
          this.selectedId = key;
          this.linkedId = null;
          await this.plugin.openDate(key);
          await this.updateActiveContext(true);
        });
        day.addEventListener("contextmenu", (event) => {
          event.preventDefault();
          this.selectedId = key;
          this.linkedId = null;
          this.plugin.startClassCaptureForDate(key);
        });
      }
    }
  }
}

// ─── Plugin Principal ───────────────────────────────────────────────────────

module.exports = class UniquePlugin extends Plugin {
  async onload() {
    this.settings = Object.assign(
      { activeFilter: "todos", shouldConfirmBeforeCreateDaily: true },
      (await this.loadData()) || {}
    );
    this.lastMainContentLeaf = null;
    this.homeOpenTimer = null;

    this.registerView(VIEW_TYPE_HOME, (leaf) => new UniqueHomeView(leaf, this));
    try {
      await this.loadOriginalCalendarOptions();
    } catch (error) {
      console.error("Unique: usando calendario propio como respaldo.", error);
      new Notice("Unique no pudo cargar el Calendar original integrado; usará el calendario de respaldo.", 7000);
      UniqueOriginalCalendarView = null;
    }
    this.registerView(VIEW_TYPE_CALENDAR, (leaf) =>
      UniqueOriginalCalendarView
        ? new UniqueOriginalCalendarView(leaf, this)
        : new UniqueCalendarView(leaf, this)
    );

    this.addRibbonIcon("home", "Abrir Inicio", () => {
      this.activateHomeView();
    });

    this.addRibbonIcon("calendar-with-checkmark", "Mostrar calendario", () => {
      this.activateCalendarView();
    });

    this.addRibbonIcon("notebook-pen", "Nueva clase (Ctrl+Shift+D)", () => {
      this.startClassCapture();
    });

    this.addRibbonIcon("layout-dashboard", "Panel de Control Universitario", () => {
      new DashboardModal(this).open();
    });

    this.addCommand({
      id: "abrir-dashboard",
      name: "Abrir Panel de Control Universitario",
      callback: () => new DashboardModal(this).open(),
    });

    this.addCommand({
      id: "abrir-inicio",
      name: "Abrir Inicio / Nueva pestaña",
      callback: () => this.activateHomeView(),
    });

    this.addCommand({
      id: "show-calendar-view",
      name: "Mostrar calendario",
      callback: () => this.activateCalendarView(),
    });

    this.addCommand({
      id: "open-today",
      name: "Abrir nota de hoy",
      callback: () => this.openDate(moment().format("YYYY-MM-DD")),
    });

    this.addCommand({
      id: "crear-apunte-clase",
      name: "Crear apunte de clase",
      callback: () => this.startClassCapture(),
    });

    this.addCommand({
      id: "reabrir-ultima-clase",
      name: "Reabrir última clase",
      callback: () => this.reopenLastClass(),
    });

    this.addCommand({
      id: "captura-rapida",
      name: "Captura rápida en el apunte actual",
      callback: () => this.openQuickCapture(),
    });

    this.addCommand({
      id: "insertar-cierre-clase",
      name: "Insertar cierre rápido de clase",
      callback: () => this.insertClassCloseout(),
    });

    this.addCommand({
      id: "vincular-nota-dia-actual",
      name: "Vincular nota actual con el día de hoy",
      callback: () => this.vincularNotaConHoy(),
    });

    this.addCommand({
      id: "marcar-apunte-ia",
      name: "Marcar fuente IA del apunte",
      callback: () => this.openAIMarker(),
    });

    this.addCommand({
      id: "conectar-apunte-ia",
      name: "Conectar con apunte paralelo de IA / humano (Ctrl+Shift+I)",
      callback: () => this.triggerConnectAICommand(),
    });

    this.addCommand({
      id: "reparar-boveda",
      name: "Reparar y sincronizar todas las conexiones de la bóveda",
      callback: () => this.repairAndSyncVault(),
    });

    this.addCommand({
      id: "revisar-recordatorios",
      name: "Revisar recordatorios ahora",
      callback: () => this.checkRecordatoriosNow(),
    });

    this.addCommand({
      id: "preparar-boveda-universitaria",
      name: "Preparar bóveda universitaria",
      callback: () => this.ensureVaultReady({ quiet: false }),
    });

    // ── Auto-limpieza integral al eliminar cualquier nota ──
    this.registerEvent(
      this.app.vault.on("delete", async (file) => {
        if (file instanceof TFile && file.extension === "md") {
          await this.handleFileDeletion(file.path, file.basename);
        }
      })
    );

    this.registerEvent(
      this.app.vault.on("create", (file) => {
        if (!(file instanceof TFile) || !this.isDailyFile(file)) return;
        window.setTimeout(() => this.normalizeDailyNote(file), 700);
      })
    );

    // ── Registrar extensión de editor para ocultar delimitadores en Live Preview ──
    try {
      const ext = this.buildEditorHideMarkersExtension();
      if (ext) {
        this.registerEditorExtension(ext);
      }
    } catch (error) {
      console.warn("No se pudo cargar la extensión de CodeMirror:", error);
    }

    // ── Registrar pestaña de Ajustes de Comunidad ──
    this.addSettingTab(new UniversitySettingsTab(this.app, this));

    // ── Procesador de Markdown para la Barra de Navegación (Reading View) ──
    this.registerMarkdownPostProcessor((element) => {
      this.renderNavigationPostProcessor(element);
    });

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        this.rememberMainContentLeaf(leaf);
        this.scheduleOpenHomeForActiveEmptyLeaf();
      })
    );

    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.scheduleOpenHomeForActiveEmptyLeaf();
      })
    );

    this.app.workspace.onLayoutReady(() => {
      this.rememberMainContentLeaf(this.app.workspace.activeLeaf);
      this.ensureVaultReady({ quiet: true })
        .then(() => {
          this.openHomeForActiveEmptyLeaf();
          this.openIfEmpty();
          return this.optimizeWorkspaceOnce();
        })
        .then(() => {
          this.scheduleCalendarPrune();
          const calendarLeaf = this.pruneDuplicateCalendarViews();
          if (!calendarLeaf) {
            return this.activateCalendarView();
          }
        })
        .catch((error) => {
          console.error("No se pudo preparar la bóveda:", error);
        });
    });

    this.registerInterval(
      window.setInterval(() => {
        this.checkRecordatorios().catch((error) => {
          console.error("No se pudieron revisar los recordatorios:", error);
        });
      }, 30000)
    );
  }

  async onunload() {
    if (this.homeOpenTimer) {
      window.clearTimeout(this.homeOpenTimer);
      this.homeOpenTimer = null;
    }
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_HOME);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CALENDAR);
  }

  async loadBundledCalendarModule() {
    if (OriginalCalendarView && originalCalendarSettings) return;
    try {
      OriginalCalendarView = bundledCalendarModule.CalendarView;
      originalCalendarSettings = bundledCalendarModule.settings;
      originalCalendarDefaultSettings = bundledCalendarModule.defaultSettings;
      originalCalendarActiveFile = bundledCalendarModule.activeFile;
    } catch (error) {
      console.error("Unique: no se pudo cargar el Calendar original integrado.", error);
      throw error;
    }
    if (!OriginalCalendarView || !originalCalendarSettings) {
      throw new Error("Unique: el Calendar original integrado no exportó la vista requerida.");
    }
    UniqueOriginalCalendarView = buildUniqueOriginalCalendarView(
      OriginalCalendarView,
      originalCalendarActiveFile
    );
  }

  async loadOriginalCalendarOptions() {
    await this.loadBundledCalendarModule();
    let legacyOptions = {};
    try {
      if (await this.app.vault.adapter.exists(".obsidian/plugins/calendar/data.json")) {
        const raw = await this.app.vault.adapter.read(".obsidian/plugins/calendar/data.json");
        legacyOptions = JSON.parse(raw);
      }
    } catch (error) {
      console.warn("Unique: no se pudieron leer los ajustes del Calendar original.", error);
    }
    const storedOptions = this.settings.originalCalendarOptions || {};
    const options = Object.assign(
      {},
      originalCalendarDefaultSettings,
      legacyOptions,
      storedOptions
    );
    options.shouldConfirmBeforeCreate =
      this.settings.shouldConfirmBeforeCreateDaily !== false;
    originalCalendarSettings.update((old) => Object.assign({}, old, options));
    this.settings.originalCalendarOptions = options;
    await this.saveData(this.settings);
  }

  async activateHomeView(targetLeaf = null) {
    let leaf = null;
    if (this.isMainContentLeaf(targetLeaf)) {
      leaf = targetLeaf;
    }
    if (!leaf) {
      const active = this.app.workspace.activeLeaf;
      if (
        this.isMainContentLeaf(active) &&
        active.getViewState()?.type === "empty"
      ) {
        leaf = active;
      }
    }
    if (!leaf) {
      leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_HOME)[0];
    }
    if (!leaf) {
      leaf = this.app.workspace.getLeaf("tab");
    }
    await leaf.setViewState({ type: VIEW_TYPE_HOME, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  async activateCalendarView() {
    let leaf = this.pruneDuplicateCalendarViews();
    if (!leaf) {
      leaf =
        this.app.workspace.getRightLeaf?.(false) ||
        this.app.workspace.getLeaf("split", "vertical");
    }
    await leaf.setViewState({ type: VIEW_TYPE_CALENDAR, active: true });
    this.pruneDuplicateCalendarViews(leaf);
    this.app.workspace.revealLeaf(leaf);
  }

  pruneDuplicateCalendarViews(preferredLeaf = null) {
    const leaves = this.app.workspace
      .getLeavesOfType(VIEW_TYPE_CALENDAR)
      .filter((leaf) => leaf && !leaf.isDisposed);
    if (!leaves.length) return null;

    let keep = preferredLeaf && leaves.includes(preferredLeaf) ? preferredLeaf : null;
    if (!keep) {
      const rightLeaves = new Set();
      this.app.workspace.rightSplit?.iterateAllLeaves?.((leaf) =>
        rightLeaves.add(leaf)
      );
      keep =
        leaves.find((leaf) => rightLeaves.has(leaf)) ||
        leaves.find((leaf) => leaf.getRoot?.() === this.app.workspace.rightSplit) ||
        leaves[0];
    }

    for (const leaf of leaves) {
      if (leaf !== keep) leaf.detach();
    }
    if (leaves.length > 1) {
      this.app.workspace.requestSaveLayout?.();
    }
    return keep;
  }

  scheduleCalendarPrune() {
    [0, 250, 1000, 2500].forEach((delay) => {
      window.setTimeout(() => this.pruneDuplicateCalendarViews(), delay);
    });
  }

  scheduleOpenHomeForActiveEmptyLeaf() {
    if (this.homeOpenTimer) window.clearTimeout(this.homeOpenTimer);
    this.homeOpenTimer = window.setTimeout(() => {
      this.homeOpenTimer = null;
      this.openHomeForActiveEmptyLeaf();
    }, 80);
  }

  openHomeForActiveEmptyLeaf() {
    const leaf = this.app.workspace.activeLeaf;
    if (!this.isMainContentLeaf(leaf)) return;
    if (leaf.getViewState()?.type !== "empty") return;
    this.activateHomeView(leaf).catch((error) => {
      console.error("Unique: no se pudo abrir Inicio en la pestaña vacía.", error);
    });
  }

  openIfEmpty() {
    let hasRealContent = false;
    this.app.workspace.iterateAllLeaves((leaf) => {
      const type = leaf.getViewState().type;
      if (type && type !== "empty" && type !== VIEW_TYPE_HOME && type !== VIEW_TYPE_CALENDAR) {
        hasRealContent = true;
      }
    });
    if (!hasRealContent) {
      this.activateHomeView(this.app.workspace.activeLeaf);
    }
  }

  isMainContentLeaf(leaf) {
    if (!leaf || leaf.isDisposed) return false;
    const type = leaf.getViewState()?.type;
    if (type === VIEW_TYPE_CALENDAR) return false;
    const root = leaf.getRoot?.();
    if (root && root === this.app.workspace.rightSplit) return false;
    if (root && root === this.app.workspace.leftSplit) return false;
    return true;
  }

  rememberMainContentLeaf(leaf) {
    if (this.isMainContentLeaf(leaf)) {
      this.lastMainContentLeaf = leaf;
    }
  }

  getMainContentLeaf() {
    const active = this.app.workspace.activeLeaf;
    if (this.isMainContentLeaf(active)) return active;
    if (this.isMainContentLeaf(this.lastMainContentLeaf)) {
      return this.lastMainContentLeaf;
    }

    const unpinned = this.app.workspace.getUnpinnedLeaf?.();
    if (this.isMainContentLeaf(unpinned)) return unpinned;

    const mainLeaves = [];
    this.app.workspace.rootSplit?.iterateAllLeaves?.((leaf) => {
      if (this.isMainContentLeaf(leaf)) mainLeaves.push(leaf);
    });
    const noteLeaf = mainLeaves.find((leaf) => {
      const type = leaf.getViewState()?.type;
      return type === "markdown" || type === "empty" || type === VIEW_TYPE_HOME;
    });
    if (noteLeaf) return noteLeaf;
    return mainLeaves[0] || this.app.workspace.getLeaf(false);
  }

  async openDate(date) {
    const existing = this.getDailyFile(date);
    const openFile = async (file) => {
      await this.openForWriting(file, this.getMainContentLeaf());
    };
    if (existing instanceof TFile) {
      await openFile(existing);
      return;
    }
    const createAndOpen = async () => {
      const file = await this.createDailyFile(date);
      await openFile(file);
    };
    if (this.settings.shouldConfirmBeforeCreateDaily !== false) {
      new ConfirmCreateDailyNoteModal(this, date, createAndOpen).open();
      return;
    }
    await createAndOpen();
  }

  async startClassCaptureForDate(date) {
    const period = this.periodForDate(date);
    const courses = this.getCourses(period);
    if (!courses.length) {
      new Notice(`No hay ramos configurados para ${period}.`, 7000);
      return;
    }
    const suggestedName = await this.suggestedCourseName(period, date);
    new CourseSelectModal(
      this,
      { date, period, targetLeaf: this.getMainContentLeaf() },
      courses,
      suggestedName
    ).open();
  }

  // ── Extensión CodeMirror 6 para ocultar delimitadores %% en Live Preview ──
  buildEditorHideMarkersExtension() {
    let CMView = null;
    let CMState = null;
    try {
      CMView = require("@codemirror/view");
      CMState = require("@codemirror/state");
    } catch (e) {
      return null;
    }

    if (
      !CMView ||
      !CMView.ViewPlugin ||
      !CMView.Decoration ||
      !CMState ||
      !CMState.RangeSetBuilder
    ) {
      return null;
    }

    const hiddenLineDeco = CMView.Decoration.line({
      class: "captura-nav-marker-hidden",
    });

    return CMView.ViewPlugin.fromClass(
      class {
        constructor(view) {
          this.decorations = this.build(view);
        }
        update(update) {
          if (update.docChanged || update.viewportChanged) {
            this.decorations = this.build(update.view);
          }
        }
        build(view) {
          const builder = new CMState.RangeSetBuilder();
          for (const { from, to } of view.visibleRanges) {
            let pos = from;
            while (pos <= to) {
              const line = view.state.doc.lineAt(pos);
              const text = line.text.trim();
              if (
                text === "%% navegacion-clase %%" ||
                text === "%% /navegacion-clase %%" ||
                text === "<!-- navegacion-clase -->" ||
                text === "<!-- /navegacion-clase -->" ||
                text.startsWith("%% navegacion-clase") ||
                text.startsWith("%% /navegacion-clase")
              ) {
                builder.add(line.from, line.from, hiddenLineDeco);
              }
              pos = line.to + 1;
            }
          }
          return builder.finish();
        }
      },
      { decorations: (v) => v.decorations }
    );
  }

  // ── Post-procesador para embellecer y limpiar navegación (Reading Mode) ──
  renderNavigationPostProcessor(element) {
    const comments = element.querySelectorAll(".cm-comment, p");
    comments.forEach((node) => {
      const text = node.textContent || "";
      if (
        text.includes("navegacion-clase") &&
        (text.includes("%%") || text.includes("<!--"))
      ) {
        node.addClass("captura-nav-marker-hidden");
      }
    });
  }

  async writeFileIfMissing(path, content) {
    const normalized = normalizePath(path);
    if (this.app.vault.getAbstractFileByPath(normalized)) return false;
    const folder = normalized.split("/").slice(0, -1).join("/");
    if (folder) await this.ensureFolder(folder);
    await this.app.vault.create(normalized, content);
    return true;
  }

  recommendedPluginStatus() {
    return [];
  }

  async ensureVaultReady({ quiet = true } = {}) {
    const created = [];
    const folders = [
      "00 Inicio",
      "01 Inbox",
      "Diario",
      "Semestres",
      "Sistema",
      "Sistema/Calendario",
      "Sistema/Plantillas",
      "Sistema/Prompts",
      "Sistema/Scripts",
    ];

    for (const folder of folders) {
      if (!this.app.vault.getAbstractFileByPath(folder)) {
        await this.ensureFolder(folder);
        created.push(folder);
      }
    }

    const today = moment().format("YYYY-MM-DD");
    const currentPeriod = this.periodForDate(today);
    if (!this.getAllSemesters().length) {
      const year = Number(currentPeriod.slice(0, 4));
      const periodNum = Number(currentPeriod.slice(-1));
      await this.createSemesterStructure({
        period: currentPeriod,
        startDate: periodNum === 1 ? `${year}-03-01` : `${year}-08-01`,
        endDate: periodNum === 1 ? `${year}-07-15` : `${year}-12-15`,
        setAsActive: true,
        quiet: true,
      });
      created.push(`Semestres/${currentPeriod}`);
    }

    const dailyTemplate = `---
fecha: {{date}}
tipo: diario
tags:
  - universidad
  - tipo/diario
---

# {{date}}

`;

    const files = [
      [
        "00 Inicio/Inicio.md",
        `# Inicio

Usa la vista Inicio del plugin para buscar, crear apuntes, abrir el diario y revisar ramos.
`,
      ],
      [
        "01 Inbox/Inbox.md",
        `# Inbox

- 
`,
      ],
      ["Sistema/Calendario/Nota diaria.md", dailyTemplate],
      ["Sistema/Plantillas/Nota diaria.md", dailyTemplate],
      [
        "Sistema/Recordatorios.md",
        `# Recordatorios

| Tipo | Cuándo | Días antes | Hora | Texto |
|---|---|---:|---|---|
| semanal | lunes |  | 08:00 | Revisar pendientes de la semana |
| anual | 03-01 |  | 09:00 | Preparar inicio de semestre |
`,
      ],
      [
        "Sistema/README.md",
        `# Sistema universitario

Esta bóveda puede funcionar con Unique sin depender de plantillas de apuntes ni plugins externos para el flujo central.
`,
      ],
    ];

    for (const [path, content] of files) {
      if (await this.writeFileIfMissing(path, content)) created.push(path);
    }

    if (!quiet) {
      const missing = this.recommendedPluginStatus().map(([, name]) => name);
      const createdText = created.length
        ? `${created.length} recursos creados.`
        : "La bóveda ya tenía los recursos base.";
      const missingText = missing.length
        ? ` Extras no activos: ${missing.join(", ")}.`
        : " Extras principales activos.";
      new Notice(`${createdText}${missingText}`, 9000);
    }

    return created;
  }

  // ── Semestres Helper ──
  getAllSemesters() {
    return getScopedMarkdownFiles(this.app, ["Semestres"])
      .map((file) => {
        const fm =
          this.app.metadataCache.getFileCache(file)?.frontmatter || {};
        if (fm.tipo !== "semestre" || !/^\d{4}-[12]$/.test(String(fm.periodo || ""))) {
          return null;
        }
        return {
          file,
          periodo: String(fm.periodo),
          inicio: String(fm.inicio || ""),
          fin: String(fm.fin || ""),
          estado: String(fm.estado || "archivado").toLowerCase(),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.periodo.localeCompare(a.periodo, "es", { numeric: true }));
  }

  async setActiveSemester(targetPeriod, { quiet = false } = {}) {
    const semesters = this.getAllSemesters();
    for (const sem of semesters) {
      const isTarget = sem.periodo === targetPeriod;
      await this.app.fileManager.processFrontMatter(sem.file, (fm) => {
        fm.estado = isTarget ? "activo" : "archivado";
      });
    }
    if (!quiet) {
      new Notice(`Semestre activo actualizado a: ${targetPeriod}`, 5000);
    }
  }

  async createSemesterStructure({
    period,
    startDate,
    endDate,
    setAsActive,
    quiet = false,
  }) {
    await this.ensureFolder(`Semestres/${period}/Cursos`);

    // 1. Archivo de Horario
    const horarioPath = `Semestres/${period}/Horario.md`;
    if (!this.app.vault.getAbstractFileByPath(horarioPath)) {
      const horarioContent = `---
periodo: ${period}
tipo: horario
estado: ${setAsActive ? "activo" : "archivado"}
tags:
  - universidad
  - periodo/${period}
  - tipo/horario
---

# Horario — ${period}

| Día | Inicio | Fin | Ramo | Sala |
|---|---|---|---|---|
| Lunes | 08:30 | 09:50 | Ramo Ejemplo | Sala 101 |
| Miércoles | 08:30 | 09:50 | Ramo Ejemplo | Sala 101 |
`;
      await this.app.vault.create(horarioPath, horarioContent);
    }

    // 2. Archivo del Semestre
    const semPath = `Semestres/${period}/Semestre - ${period}.md`;
    if (!this.app.vault.getAbstractFileByPath(semPath)) {
      const semContent = `---
periodo: ${period}
inicio: ${startDate}
fin: ${endDate}
tipo: semestre
estado: ${setAsActive ? "activo" : "archivado"}
tags:
  - universidad
  - periodo/${period}
  - tipo/semestre
---

# Semestre ${period}

## Resumen del Semestre
- **Inicio:** ${startDate}
- **Término:** ${endDate}
- **Estado:** ${setAsActive ? "Activo" : "Archivado"}
`;
      await this.app.vault.create(semPath, semContent);
    }

    if (setAsActive) {
      await this.setActiveSemester(period, { quiet });
    }

    if (!quiet) {
      new Notice(`Semestre ${period} creado correctamente.`, 6000);
    }
  }

  async createCourseStructure({
    period,
    name,
    professor,
    siglaRamo,
    siglaProfesor,
    prefix,
  }) {
    const courseFolder = `Semestres/${period}/Cursos/${name}`;
    await this.ensureFolder(courseFolder);

    const indexPath = `${courseFolder}/Índice - ${name} - ${period}.md`;
    if (!this.app.vault.getAbstractFileByPath(indexPath)) {
      const indexContent = `---
periodo: ${period}
ramo: ${yamlString(name)}
profesor: ${yamlString(professor)}
sigla_ramo: ${yamlString(siglaRamo)}
sigla_profesor: ${yamlString(siglaProfesor)}
prefijo_apuntes: ${yamlString(prefix)}
tipo: indice-ramo
estado: activo
tags:
  - universidad
  - periodo/${period}
  - tipo/indice-ramo
---

# ${name}

**Profesor:** ${professor}  
**Sigla del ramo:** \`${siglaRamo}\`  
**Sigla del profesor:** \`${siglaProfesor}\`  
**Prefijo de los apuntes:** \`${prefix}\`

## Apuntes

%% clases-automaticas %%
%% /clases-automaticas %%

`;
      await this.app.vault.create(indexPath, indexContent);
    }

    new Notice(`Ramo "${name}" añadido a ${period}.`, 6000);
  }

  // ── Gestión de etiquetas de apunte persistentes ──
  async getPersistentNoteLabels() {
    const data = (await this.loadData()) || {};
    if (Array.isArray(data.customNoteLabels) && data.customNoteLabels.length) {
      return data.customNoteLabels;
    }
    return [...DEFAULT_NOTE_LABELS];
  }

  async savePersistentNoteLabels(labels) {
    const data = (await this.loadData()) || {};
    data.customNoteLabels = labels.filter(Boolean);
    await this.saveData(data);
  }

  // ── Conexión Bidireccional de Apunte con Versión IA ──
  async triggerConnectAICommand() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!(activeFile instanceof TFile)) {
      new Notice("Abre primero la nota que deseas conectar.", 5000);
      return;
    }

    const folder = activeFile.parent;
    if (!(folder instanceof TFolder)) {
      new Notice("La nota no pertenece a una carpeta válida.", 5000);
      return;
    }

    const siblings = folder.children.filter(
      (f) =>
        f instanceof TFile &&
        f.extension === "md" &&
        f.path !== activeFile.path
    );

    const isCurrentAI =
      Boolean(detectAISourceFromFilename(activeFile.basename)) ||
      Boolean(
        this.app.metadataCache.getFileCache(activeFile)?.frontmatter?.fuente
      );

    if (!isCurrentAI) {
      const baseName = activeFile.basename;
      const matched = siblings.filter((f) => {
        const candBase = stripAISuffix(f.basename);
        return candBase === baseName && detectAISourceFromFilename(f.basename);
      });

      if (matched.length === 1) {
        await this.connectNotesBidirectional(activeFile, matched[0]);
        return;
      }

      new ConnectAIModal(this, activeFile, siblings).open();
    } else {
      const baseName = stripAISuffix(activeFile.basename);
      const matched = siblings.filter((f) => f.basename === baseName);

      if (matched.length === 1) {
        await this.connectNotesBidirectional(matched[0], activeFile);
        return;
      }

      new ConnectAIModal(this, activeFile, siblings, true).open();
    }
  }

  async connectNotesBidirectional(humanFile, iaFile) {
    const aiSource =
      detectAISourceFromFilename(iaFile.basename) ||
      this.app.metadataCache.getFileCache(iaFile)?.frontmatter?.fuente ||
      "IA";

    const humanRel = withoutExtension(humanFile.path);
    const iaRel = withoutExtension(iaFile.path);

    await this.app.fileManager.processFrontMatter(humanFile, (fm) => {
      fm.version_ia = `[[${iaRel}|${iaFile.basename}]]`;
      delete fm.desarrollado_con_ia;
    });

    await this.app.fileManager.processFrontMatter(iaFile, (fm) => {
      fm.version_original = `[[${humanRel}|${humanFile.basename}]]`;
      fm.fuente = normalizeAISource(aiSource) || aiSource;
      delete fm.desarrollado_con_ia;
    });

    await this.rebuildRelatedCourse(humanFile);

    new Notice(
      `Conexión bidireccional lista:\n${humanFile.basename} ↔ ${iaFile.basename}`,
      6000
    );
  }

  // ── Auto-limpieza al Eliminar una Nota ──
  async handleFileDeletion(deletedPath, deletedBase) {
    const targetLinkRegex = new RegExp(
      `\\[\\[(?:${escapeRegExp(withoutExtension(deletedPath))}|${escapeRegExp(
        deletedBase
      )})(?:\\|[^\\]]*)?\\]\\]`,
      "i"
    );

    const dailyFiles = getScopedMarkdownFiles(this.app, ["Diario"]).filter((f) =>
      this.isDailyFile(f)
    );

    for (const daily of dailyFiles) {
      const content = await this.app.vault.read(daily);
      if (targetLinkRegex.test(content)) {
        const cleaned = removeLinkFromContent(content, targetLinkRegex);
        if (isDailyNoteEmpty(cleaned)) {
          await this.app.vault.delete(daily);
          new Notice(
            `Nota diaria (${daily.basename}) eliminada automáticamente porque ya no tenía apuntes.`,
            5000
          );
        } else if (cleaned !== content) {
          await this.app.vault.modify(daily, cleaned);
        }
      }
    }

    const allMarkdown = getScopedMarkdownFiles(this.app, ["Semestres", "Diario"]);
    for (const file of allMarkdown) {
      const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (fm?.version_ia && targetLinkRegex.test(String(fm.version_ia))) {
        await this.app.fileManager.processFrontMatter(file, (f) => {
          delete f.version_ia;
        });
      }
      if (
        fm?.version_original &&
        targetLinkRegex.test(String(fm.version_original))
      ) {
        await this.app.fileManager.processFrontMatter(file, (f) => {
          delete f.version_original;
        });
      }
    }

    const courseMatch = deletedPath.match(
      /^Semestres\/([^/]+)\/Cursos\/([^/]+)\//
    );
    if (courseMatch) {
      const period = courseMatch[1];
      const courseName = courseMatch[2];
      const course = this.getCourseByName(period, courseName);
      if (course) {
        await this.rebuildCourseStructure(course);
      }
    }

    const data = (await this.loadData()) || {};
    if (data.lastClassPath === deletedPath) {
      data.lastClassPath = "";
      await this.saveData(data);
    }
  }

  async cleanEmptyDailyNotes() {
    let deletedCount = 0;
    const dailyFiles = getScopedMarkdownFiles(this.app, ["Diario"]).filter((f) =>
      this.isDailyFile(f)
    );
    for (const daily of dailyFiles) {
      const content = await this.app.vault.read(daily);
      if (isDailyNoteEmpty(content)) {
        await this.app.vault.delete(daily);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  // ── Reparar y sincronizar toda la bóveda ──
  async repairAndSyncVault() {
    new Notice("Iniciando revisión y sincronización de toda la bóveda…", 4000);
    const semesters = this.getAllSemesters();
    let coursesFixed = 0;
    let notesConnected = 0;

    for (const sem of semesters) {
      const courses = this.getCourses(sem.periodo);
      for (const course of courses) {
        coursesFixed++;
        const files = course.folder.children.filter(
          (f) => f instanceof TFile && f.extension === "md"
        );
        for (const file of files) {
          const fm =
            this.app.metadataCache.getFileCache(file)?.frontmatter || {};
          const isAI =
            Boolean(detectAISourceFromFilename(file.basename)) ||
            Boolean(fm.fuente);

          const label = noteLabelFrom(file, fm);
          const meta = getNoteTypeMeta(label, sem.periodo);

          // Si el archivo es el índice del ramo, nos aseguramos de que mantenga el tipo correcto
          const isIndexFile = file.path === course.index.path;
          const targetTipo = isIndexFile ? "indice-ramo" : meta.tipo;

          if (fm.tipo !== targetTipo) {
            await this.app.fileManager.processFrontMatter(
              file,
              (frontmatter) => {
                frontmatter.tipo = targetTipo;
                if (!isIndexFile) {
                  frontmatter.etiqueta_apunte = label;
                }
              }
            );
          }

          if (!isAI && !fm.version_ia) {
            const gemela = files.find((f) => {
              const b = stripAISuffix(f.basename);
              return (
                b === file.basename &&
                detectAISourceFromFilename(f.basename)
              );
            });
            if (gemela) {
              await this.connectNotesBidirectional(file, gemela);
              notesConnected++;
            }
          }
        }
        await this.rebuildCourseStructure(course);
      }
    }

    const removed = await this.cleanEmptyDailyNotes();

    new Notice(
      `Bóveda sincronizada:\n${coursesFixed} cursos reconstruidos. ${notesConnected} parejas de IA conectadas. ${removed} diarios vacíos limpiados.`,
      7000
    );
  }

  openAIMarker() {
    const file = this.app.workspace.getActiveFile();
    if (!(file instanceof TFile)) {
      new Notice("No hay ninguna nota activa para marcar.", 5000);
      return;
    }
    new AISourceModal(this, file).open();
  }

  async markFileAsAI(file, source) {
    const normalizedSource = normalizeAISource(source);
    if (!normalizedSource) return;

    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      frontmatter.fuente = normalizedSource;
      delete frontmatter.desarrollado_con_ia;
    });

    const suffix = aiSuffix(normalizedSource);
    const targetBase = `${stripAISuffix(file.basename)} ${suffix}`;
    let targetFile = file;

    if (file.basename !== targetBase) {
      const folderPath = file.parent?.path || "";
      const targetPath = normalizePath(
        folderPath ? `${folderPath}/${targetBase}.md` : `${targetBase}.md`
      );
      const existing = this.app.vault.getAbstractFileByPath(targetPath);
      if (existing instanceof TFile && existing.path !== file.path) {
        new Notice(
          "Propiedades actualizadas, pero ya existe una nota con ese nombre.",
          8000
        );
      } else {
        await this.app.fileManager.renameFile(file, targetPath);
        const renamed = this.app.vault.getAbstractFileByPath(targetPath);
        if (renamed instanceof TFile) targetFile = renamed;
      }
    }

    await this.waitForFrontmatter(targetFile);
    await this.rebuildRelatedCourse(targetFile);
    await this.openForWriting(targetFile);
    new Notice(
      `Apunte marcado como desarrollado con IA: ${normalizedSource}.`,
      6000
    );
  }

  async rebuildRelatedCourse(file) {
    const content = await this.app.vault.read(file);
    const cached =
      this.app.metadataCache.getFileCache(file)?.frontmatter || {};
    const ramo = String(
      cached.ramo || frontmatterScalar(content, "ramo") || ""
    );
    const fecha = String(
      cached.fecha || frontmatterScalar(content, "fecha") || ""
    );
    const period = String(
      cached.periodo ||
        frontmatterScalar(content, "periodo") ||
        (/^\d{4}-\d{2}-\d{2}$/.test(fecha)
          ? this.periodForDate(fecha)
          : this.activePeriod())
    );
    if (!ramo || !period) return;

    const course = this.getCourseByName(period, ramo);
    if (!course) return;
    await this.rebuildCourseStructure(course);
  }

  getRecordatoriosFile() {
    const file = this.app.vault.getAbstractFileByPath(
      "Sistema/Recordatorios.md"
    );
    return file instanceof TFile ? file : null;
  }

  async checkRecordatorios() {
    const file = this.getRecordatoriosFile();
    if (!file) return;

    const rows = parseRecordatorios(await this.app.vault.read(file));
    if (!rows.length) return;

    const now = moment();
    const today = now.format("YYYY-MM-DD");
    const nowHM = now.format("HH:mm");
    const weekday = normalizeSearch(now.locale("es").format("dddd"));
    const monthDay = now.format("MM-DD");

    const data = (await this.loadData()) || {};
    const fired = data.recordatoriosDisparados || {};
    let changed = false;

    for (const row of rows) {
      if (row.hora !== nowHM) continue;

      let due = false;
      if (row.tipo === "semanal") {
        due = normalizeSearch(row.cuando) === weekday;
      } else if (row.tipo === "anual") {
        due = row.cuando === monthDay;
      } else if (row.tipo === "unico") {
        due = row.cuando === today;
      } else if (row.tipo === "antes") {
        const objetivo = moment(row.cuando, "YYYY-MM-DD");
        due =
          objetivo.isValid() &&
          Number.isFinite(row.diasAntes) &&
          objetivo.startOf("day").diff(now.clone().startOf("day"), "days") ===
            row.diasAntes;
      }
      if (!due) continue;

      const key = `${row.tipo}|${row.cuando}|${row.hora}|${row.texto}`;
      if (fired[key] === today) continue;

      this.dispararRecordatorio(row.texto);
      fired[key] = today;
      changed = true;
    }

    if (changed) {
      data.recordatoriosDisparados = fired;
      await this.saveData(data);
    }
  }

  dispararRecordatorio(texto) {
    new Notice(`[Recordatorio] ${texto}`, 15000);
    try {
      if (typeof Notification === "undefined") return;
      if (Notification.permission === "granted") {
        new Notification("Recordatorio", { body: texto });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted")
            new Notification("Recordatorio", { body: texto });
        });
      }
    } catch (error) {
      console.warn("No se pudo mostrar la notificación nativa:", error);
    }
  }

  async checkRecordatoriosNow() {
    await this.checkRecordatorios();
    new Notice("Recordatorios revisados.", 3000);
  }

  async optimizeWorkspaceOnce() {
    const data = (await this.loadData()) || {};
    if (data.workspaceOptimized) return;

    const disposableRightViews = new Set([
      "all-properties",
      "graph",
      "outgoing-link",
      "tag",
    ]);
    const rightLeaves = new Set();
    this.app.workspace.rightSplit?.iterateAllLeaves?.((leaf) =>
      rightLeaves.add(leaf)
    );
    for (const type of disposableRightViews) {
      for (const leaf of this.app.workspace.getLeavesOfType(type)) {
        if (
          rightLeaves.has(leaf) ||
          leaf.getRoot?.() === this.app.workspace.rightSplit
        )
          leaf.detach();
      }
    }

    const fileExplorer =
      this.app.workspace.getLeavesOfType("file-explorer")[0]?.view;
    if (typeof fileExplorer?.setSortOrder === "function") {
      try {
        fileExplorer.setSortOrder("alphabetical");
      } catch (error) {
        console.warn("No se pudo cambiar el orden del explorador:", error);
      }
    }

    const calendar = this.app.workspace.getLeavesOfType("calendar")[0];
    if (calendar) this.app.workspace.revealLeaf(calendar);

    data.workspaceOptimized = true;
    await this.saveData(data);
  }

  async startClassCapture() {
    const context = this.getCaptureContext();
    context.targetLeaf =
      this.app.workspace.activeLeaf || this.app.workspace.getLeaf(false);
    const courses = this.getCourses(context.period);
    if (!courses.length) {
      new Notice(`No hay ramos configurados para ${context.period}.`, 7000);
      return;
    }
    const suggestedName = await this.suggestedCourseName(
      context.period,
      context.date
    );
    new CourseSelectModal(this, context, courses, suggestedName).open();
  }

  getScheduleFile(period) {
    const file = this.app.vault.getAbstractFileByPath(
      normalizePath(`Semestres/${period}/Horario.md`)
    );
    return file instanceof TFile ? file : null;
  }

  async suggestedCourseName(period, date) {
    const file = this.getScheduleFile(period);
    if (!file) return "";
    const rows = parseHorario(await this.app.vault.read(file));
    if (!rows.length) return "";
    const weekday = normalizeSearch(
      moment(date, "YYYY-MM-DD").locale("es").format("dddd")
    );
    const nowMinutes = timeToMinutes(moment().format("HH:mm"));
    const match = rows.find(
      (row) =>
        row.day === weekday &&
        nowMinutes >= row.startMinutes &&
        nowMinutes < row.endMinutes
    );
    return match ? match.course : "";
  }

  getCaptureContext() {
    const active = this.app.workspace.getActiveFile();
    if (active && this.isDailyFile(active)) {
      return {
        date: active.basename,
        period: this.periodForDate(active.basename),
      };
    }

    const date = moment().format("YYYY-MM-DD");
    return {
      date,
      period: this.activePeriod() || this.periodForDate(date),
    };
  }

  activePeriod() {
    const activeSemester = getScopedMarkdownFiles(this.app, ["Semestres"])
      .map((file) => ({
        file,
        frontmatter: this.app.metadataCache.getFileCache(file)?.frontmatter,
      }))
      .find(
        ({ frontmatter }) =>
          frontmatter?.tipo === "semestre" &&
          String(frontmatter?.estado || "").toLowerCase() === "activo" &&
          /^\d{4}-[12]$/.test(String(frontmatter?.periodo || ""))
      );
    return activeSemester ? String(activeSemester.frontmatter.periodo) : "";
  }

  statusForPeriod(period) {
    const semester = getScopedMarkdownFiles(this.app, ["Semestres"])
      .map((file) => this.app.metadataCache.getFileCache(file)?.frontmatter)
      .find(
        (frontmatter) =>
          frontmatter?.tipo === "semestre" &&
          String(frontmatter?.periodo || "") === String(period)
      );
    const status = String(semester?.estado || "").toLowerCase();
    if (status === "activo" || status === "archivado") return status;
    return String(period) === this.activePeriod() ? "activo" : "archivado";
  }

  periodForDate(date) {
    const semester = getScopedMarkdownFiles(this.app, ["Semestres"])
      .map((file) => this.app.metadataCache.getFileCache(file)?.frontmatter)
      .find((frontmatter) => {
        const start = String(frontmatter?.inicio || "");
        const end = String(frontmatter?.fin || "");
        return (
          frontmatter?.tipo === "semestre" &&
          /^\d{4}-\d{2}-\d{2}$/.test(start) &&
          /^\d{4}-\d{2}-\d{2}$/.test(end) &&
          date >= start &&
          date <= end
        );
      });
    if (semester?.periodo) return String(semester.periodo);

    const [year, month] = date.split("-").map(Number);
    return `${year}-${month <= 6 ? 1 : 2}`;
  }

  getCourses(period) {
    const root = this.app.vault.getAbstractFileByPath(
      `Semestres/${period}/Cursos`
    );
    if (!(root instanceof TFolder)) return [];

    return root.children
      .filter((child) => child instanceof TFolder)
      .map((folder) => {
        const index = folder.children.find((child) => {
          if (!(child instanceof TFile) || child.extension !== "md")
            return false;
          const fm = this.app.metadataCache.getFileCache(child)?.frontmatter;
          return (
            fm?.tipo === "indice-ramo" ||
            (fm?.prefijo_apuntes && (fm?.tipo === "clase" || fm?.tipo === "indice"))
          );
        });
        if (!(index instanceof TFile)) return null;
        const frontmatter =
          this.app.metadataCache.getFileCache(index)?.frontmatter || {};
        return {
          name: folder.name,
          folder,
          index,
          professor: String(frontmatter.profesor || ""),
          prefix: String(frontmatter.prefijo_apuntes || ""),
        };
      })
      .filter((course) => course?.professor && course?.prefix)
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  getCourseByName(period, name) {
    const normalizedName = normalizeSearch(name);
    return this.getCourses(period).find(
      (course) => normalizeSearch(course.name) === normalizedName
    );
  }

  suggestNextClassNumber(course) {
    return this.suggestNextNoteNumber(course, "Clase");
  }

  suggestNextNoteNumber(course, noteLabel) {
    const label = normalizeNoteLabel(noteLabel);
    const numbers = course.folder.children
      .filter((file) => file instanceof TFile && file.extension === "md")
      .map((file) => {
        const frontmatter =
          this.app.metadataCache.getFileCache(file)?.frontmatter;
        if (noteLabelFrom(file, frontmatter) !== label) return null;
        return classNumberFrom(file, frontmatter);
      })
      .filter((number) => number !== null);
    if (!numbers.length) return "1";
    return String(Math.floor(Math.max(...numbers)) + 1);
  }

  async createClass({
    date,
    period,
    course,
    topic,
    number,
    noteLabel,
    aiSource,
    targetLeaf,
  }) {
    const source = normalizeAISource(aiSource);
    const suffix = aiSuffix(source);
    const label = normalizeNoteLabel(noteLabel);
    const meta = getNoteTypeMeta(label, period);

    const titleBase = topic
      ? `(${course.prefix}) ${label} ${number} - ${topic}`
      : `(${course.prefix}) ${label} ${number}`;
    const title = suffix ? `${stripAISuffix(titleBase)} ${suffix}` : titleBase;
    const classPath = normalizePath(`${course.folder.path}/${title}.md`);
    const existing = this.app.vault.getAbstractFileByPath(classPath);

    if (existing instanceof TFile) {
      try {
        const existingContent = await this.app.vault.read(existing);
        const cached =
          this.app.metadataCache.getFileCache(existing)?.frontmatter || {};
        const storedDate = String(
          cached.fecha || frontmatterScalar(existingContent, "fecha") || ""
        );
        const linkedDate = /^\d{4}-\d{2}-\d{2}$/.test(storedDate)
          ? storedDate
          : date;
        const storedPeriod = String(
          cached.periodo || frontmatterScalar(existingContent, "periodo") || ""
        );
        const linkedPeriod = /^\d{4}-[12]$/.test(storedPeriod)
          ? storedPeriod
          : this.periodForDate(linkedDate);
        await this.ensureDailyLink({
          date: linkedDate,
          period: linkedPeriod,
          course,
          classFile: existing,
          title,
        });
        await this.rebuildCourseStructure(course);
        new Notice("Ese apunte ya existía; reparé sus enlaces y lo abrí.", 5000);
      } catch (error) {
        console.error("Error al reabrir apunte existente:", error);
      }
      await this.waitForFrontmatter(existing);
      await this.openForWriting(existing, targetLeaf);
      return;
    }

    const status = this.statusForPeriod(period);
    const indexTarget = withoutExtension(course.index.path);
    const dayTarget = date;
    const navigation = [
      `[[${indexTarget}|${course.name}]]`,
      `[[${dayTarget}|${date}]]`,
    ]
      .filter(Boolean)
      .join(" · ");

    const tagsBlock = meta.tags.map((t) => `  - ${t}`).join("\n");
    const classesBlock = meta.cssclasses.map((c) => `  - ${c}`).join("\n");

    const content = `---
fecha: ${date}
periodo: ${period}
ramo: ${yamlString(course.name)}
profesor: ${yamlString(course.professor)}
numero: ${yamlString(number)}
numero_clase: ${yamlString(number)}
etiqueta_apunte: ${yamlString(label)}
${source ? `fuente: ${yamlString(source)}\n` : ""}tipo: ${meta.tipo}
estado: ${status}
tags:
${tagsBlock}
cssclasses:
${classesBlock}
---

%% navegacion-clase %%
${navigation}
%% /navegacion-clase %%

`;

    const classFile = await this.app.vault.create(classPath, content);
    try {
      await this.ensureDailyLink({ date, period, course, classFile, title });
      await this.rebuildCourseStructure(course);
    } catch (error) {
      console.error("El apunte se creó pero hubo un fallo en enlaces:", error);
    }

    await this.waitForFrontmatter(classFile);
    await this.openForWriting(classFile, targetLeaf);
  }

  async waitForFrontmatter(file, timeout = 500) {
    if (this.app.metadataCache.getFileCache(file)?.frontmatter) return;
    await new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        this.app.metadataCache.offref(ref);
        resolve();
      };
      const ref = this.app.metadataCache.on("changed", (changedFile) => {
        if (changedFile.path === file.path) finish();
      });
      window.setTimeout(finish, timeout);
    });
  }

  isDailyFile(file) {
    return (
      file instanceof TFile &&
      /^Diario\/\d{4}-\d{2}\/\d{4}-\d{2}-\d{2}\.md$/.test(file.path)
    );
  }

  async ensureFolder(folderPath) {
    const parts = normalizePath(folderPath).split("/");
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(current)) {
        await this.app.vault.createFolder(current);
      }
    }
  }

  getDailyFile(date) {
    return this.app.vault.getAbstractFileByPath(`Diario/${date.slice(0, 7)}/${date}.md`);
  }

  buildDailyNoteContent(date) {
    const period = this.periodForDate(date);
    const humanDate = moment(date, "YYYY-MM-DD")
      .locale("es")
      .format("dddd D [de] MMMM");
    const heading = humanDate.charAt(0).toUpperCase() + humanDate.slice(1);
    const status = this.statusForPeriod(period);
    return `---
fecha: ${date}
periodo: ${period}
tipo: diario
estado: ${status}
tags:
  - universidad
  - periodo/${period}
  - tipo/diario
---

# ${heading}

`;
  }

  async createDailyFile(date) {
    const folder = `Diario/${date.slice(0, 7)}`;
    await this.ensureFolder(folder);
    const existing = this.getDailyFile(date);
    if (existing instanceof TFile) return existing;
    return this.app.vault.create(`${folder}/${date}.md`, this.buildDailyNoteContent(date));
  }

  async getOrCreateDailyFile(date) {
    let dayFile = this.getDailyFile(date);
    if (!(dayFile instanceof TFile)) {
      dayFile = await this.createDailyFile(date);
    }
    return dayFile;
  }

  async ensureDailyLink({ date, period, course, classFile, title }) {
    const dayFile = await this.getOrCreateDailyFile(date);
    const target = withoutExtension(classFile.path);
    const link = `[[${target}|${title}]]`;
    const currentDay = await this.app.vault.read(dayFile);
    const updatedDay = appendLinkToSection(
      currentDay,
      `## ${course.name}`,
      link
    );
    if (updatedDay !== currentDay) {
      await this.app.vault.process(dayFile, (content) =>
        appendLinkToSection(content, `## ${course.name}`, link)
      );
    }
    await this.normalizeDailyNote(dayFile);
  }

  async getCourseClassRecords(course) {
    const records = [];
    const files = course.folder.children.filter(
      (file) => file instanceof TFile && file.extension === "md"
    );

    for (const file of files) {
      const content = await this.app.vault.read(file);
      const cached =
        this.app.metadataCache.getFileCache(file)?.frontmatter || {};
      const displayNumber = String(
        cached.numero ??
          cached.numero_clase ??
          frontmatterScalar(content, "numero") ??
          frontmatterScalar(content, "numero_clase") ??
          file.basename.match(
            /\b(?:Clase|M[oó]dulo|Semana|Lectura|Estudio|Control|Prueba|Taller|Laboratorio|Ayudant[ií]a)\s+([0-9]+(?:[.,-][0-9A-Za-z]+)?)/i
          )?.[1] ??
          ""
      ).trim();
      const number = classNumberFrom(file, {
        ...cached,
        numero: displayNumber,
        numero_clase: displayNumber,
      });
      if (number === null) continue;

      const separator = file.basename.indexOf(" - ");
      const label = noteLabelFrom(file, cached);
      const isAI =
        Boolean(detectAISourceFromFilename(file.basename)) ||
        Boolean(cached.fuente || frontmatterScalar(content, "fuente"));
      const aiSource =
        detectAISourceFromFilename(file.basename) ||
        String(cached.fuente || frontmatterScalar(content, "fuente") || "");

      records.push({
        file,
        label,
        number,
        displayNumber,
        isAI,
        aiSource,
        versionIA: String(
          cached.version_ia || frontmatterScalar(content, "version_ia") || ""
        ),
        versionOriginal: String(
          cached.version_original ||
            frontmatterScalar(content, "version_original") ||
            ""
        ),
        date: String(
          cached.fecha || frontmatterScalar(content, "fecha") || ""
        ),
        topic:
          separator === -1
            ? ""
            : stripAISuffix(file.basename.slice(separator + 3).trim()),
        content,
        managed:
          (content.includes("%% navegacion-clase %%") ||
            content.includes("<!-- navegacion-clase -->")) &&
          (content.includes("%% /navegacion-clase %%") ||
            content.includes("<!-- /navegacion-clase -->")),
      });
    }

    return records.sort(
      (a, b) =>
        a.number - b.number ||
        a.displayNumber.localeCompare(b.displayNumber, "es", {
          numeric: true,
        }) ||
        a.file.basename.localeCompare(b.file.basename, "es", { numeric: true })
    );
  }

  async rebuildCourseStructure(course) {
    const allRecords = await this.getCourseClassRecords(course);
    const indexTarget = withoutExtension(course.index.path);
    const navigationPattern =
      /(?:%% navegacion-clase %%|<!-- navegacion-clase -->)[\s\S]*?(?:%% \/navegacion-clase %%|<!-- \/navegacion-clase -->)/;

    const seriesMap = new Map();
    const aiRecords = [];

    for (const record of allRecords) {
      if (record.isAI) {
        aiRecords.push(record);
      } else {
        if (!seriesMap.has(record.label)) {
          seriesMap.set(record.label, []);
        }
        seriesMap.get(record.label).push(record);
      }
    }

    // 1. Navegación para series principales
    for (const [, records] of seriesMap.entries()) {
      for (let index = 0; index < records.length; index += 1) {
        const record = records[index];
        if (!record.managed) continue;

        const previous = records[index - 1];
        const next = records[index + 1];

        const matchedAI =
          aiRecords.find(
            (ai) => stripAISuffix(ai.file.basename) === record.file.basename
          ) ||
          (record.versionIA
            ? allRecords.find((r) =>
                record.versionIA.includes(withoutExtension(r.file.path))
              )
            : null);

        const aiLink = matchedAI
          ? `[[${withoutExtension(matchedAI.file.path)}|Versión IA${
              matchedAI.aiSource ? ` (${matchedAI.aiSource})` : ""
            }]]`
          : "";

        const links = [
          previous
            ? `[[${withoutExtension(previous.file.path)}|← ${previous.label} ${
                previous.displayNumber
              }]]`
            : "",
          `[[${indexTarget}|${course.name}]]`,
          /^\d{4}-\d{2}-\d{2}$/.test(record.date)
            ? `[[${record.date}|${record.date}]]`
            : "",
          aiLink,
          next
            ? `[[${withoutExtension(next.file.path)}|${next.label} ${
                next.displayNumber
              } →]]`
            : "",
        ]
          .filter(Boolean)
          .join(" · ");

        const block = `%% navegacion-clase %%\n${links}\n%% /navegacion-clase %%`;
        const currentBlock =
          record.content.match(navigationPattern)?.[0] || "";
        if (currentBlock !== block) {
          await this.app.vault.process(record.file, (content) =>
            content.replace(navigationPattern, block)
          );
        }
      }
    }

    // 2. Navegación para notas de IA
    for (const aiRecord of aiRecords) {
      if (!aiRecord.managed) continue;

      const baseName = stripAISuffix(aiRecord.file.basename);
      const matchedHuman = allRecords.find(
        (r) =>
          !r.isAI &&
          (r.file.basename === baseName ||
            aiRecord.versionOriginal.includes(withoutExtension(r.file.path)))
      );

      const humanLink = matchedHuman
        ? `[[${withoutExtension(matchedHuman.file.path)}|← Apunte original]]`
        : "";

      const links = [
        humanLink,
        `[[${indexTarget}|${course.name}]]`,
        /^\d{4}-\d{2}-\d{2}$/.test(aiRecord.date)
          ? `[[${aiRecord.date}|${aiRecord.date}]]`
          : "",
      ]
        .filter(Boolean)
        .join(" · ");

      const block = `%% navegacion-clase %%\n${links}\n%% /navegacion-clase %%`;
      const currentBlock =
        aiRecord.content.match(navigationPattern)?.[0] || "";
      if (currentBlock !== block) {
        await this.app.vault.process(aiRecord.file, (content) =>
          content.replace(navigationPattern, block)
        );
      }
    }

    // 3. Bloque automático en el índice del curso
    const automaticLinks = allRecords
      .filter((record) => record.managed)
      .map((record) => {
        const alias = `${record.label} ${record.displayNumber}${
          record.topic ? ` · ${record.topic}` : ""
        }${record.isAI ? ` (${record.aiSource || "IA"})` : ""}`;
        return `- [[${withoutExtension(record.file.path)}|${alias}]]`;
      });

    if (automaticLinks.length) {
      const legacyMarkers = [
        ["<!-- clases-automaticas -->", "<!-- /clases-automaticas -->"],
      ];
      const indexContent = await this.app.vault.read(course.index);
      const updatedIndex = upsertManagedBlock(
        indexContent,
        "## Apuntes",
        "%% clases-automaticas %%",
        "%% /clases-automaticas %%",
        automaticLinks,
        legacyMarkers
      );
      if (updatedIndex !== indexContent) {
        await this.app.vault.process(course.index, (content) =>
          upsertManagedBlock(
            content,
            "## Apuntes",
            "%% clases-automaticas %%",
            "%% /clases-automaticas %%",
            automaticLinks,
            legacyMarkers
          )
        );
      }
    }
  }

  async normalizeDailyNote(file) {
    if (!(file instanceof TFile) || !this.isDailyFile(file)) return;
    const date = file.basename;
    const period = this.periodForDate(date);
    const status = this.statusForPeriod(period);
    const cached =
      this.app.metadataCache.getFileCache(file)?.frontmatter || {};
    const cachedTags = Array.isArray(cached.tags)
      ? cached.tags.map(String)
      : cached.tags
      ? [String(cached.tags)]
      : [];
    const normalizedTags = [
      ...cachedTags.filter(
        (tag) =>
          tag !== "universidad" &&
          tag !== "tipo/diario" &&
          !tag.startsWith("periodo/")
      ),
      "universidad",
      `periodo/${period}`,
      "tipo/diario",
    ];
    if (
      String(cached.fecha || "") === date &&
      String(cached.periodo || "") === period &&
      String(cached.tipo || "") === "diario" &&
      String(cached.estado || "") === status &&
      cachedTags.length === normalizedTags.length &&
      cachedTags.every((tag, index) => tag === normalizedTags[index])
    ) {
      return;
    }

    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      frontmatter.fecha = date;
      frontmatter.periodo = period;
      frontmatter.tipo = "diario";
      frontmatter.estado = status;
      const tags = Array.isArray(frontmatter.tags)
        ? frontmatter.tags.map(String)
        : frontmatter.tags
        ? [String(frontmatter.tags)]
        : [];
      frontmatter.tags = [
        ...tags.filter(
          (tag) =>
            tag !== "universidad" &&
            tag !== "tipo/diario" &&
            !tag.startsWith("periodo/")
        ),
        "universidad",
        `periodo/${period}`,
        "tipo/diario",
      ];
    });
  }

  async openForWriting(file, targetLeaf = null) {
    if (this.shouldRememberAsLastClass(file)) {
      await this.recordLastClass(file);
    }
    let leaf = targetLeaf;
    if (!leaf || leaf.isDisposed) {
      leaf = this.app.workspace.activeLeaf || this.app.workspace.getLeaf(false);
    }
    await leaf.openFile(file, { state: { mode: "source" } });
    this.rememberMainContentLeaf(leaf);
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
    window.setTimeout(() => {
      const editor = leaf.view?.editor;
      if (!editor) return;
      const lastLine = Math.max(0, editor.lineCount() - 1);
      editor.setCursor({
        line: lastLine,
        ch: editor.getLine(lastLine).length,
      });
      editor.focus();
    }, 80);
  }

  async recordLastClass(file) {
    const data = (await this.loadData()) || {};
    data.lastClassPath = file.path;
    await this.saveData(data);
  }

  shouldRememberAsLastClass(file) {
    if (!(file instanceof TFile) || file.extension !== "md") return false;
    if (this.isDailyFile(file)) return false;
    if (!/^Semestres\/[^/]+\/Cursos\/[^/]+\//.test(file.path)) return false;
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
    const tipo = String(fm.tipo || "").toLowerCase();
    return tipo !== "indice-ramo" && tipo !== "semestre" && tipo !== "horario";
  }

  async reopenLastClass() {
    const data = (await this.loadData()) || {};
    const path = data.lastClassPath;
    if (!path) {
      new Notice("Todavía no has creado ninguna clase.", 5000);
      return;
    }
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      new Notice("La última clase registrada ya no existe.", 5000);
      return;
    }
    const leaf =
      this.app.workspace.activeLeaf || this.app.workspace.getLeaf(false);
    await this.openForWriting(file, leaf);
  }

  async getQuickCaptureTarget() {
    const leaf = this.app.workspace.activeLeaf;
    const file = leaf?.view?.file;
    if (
      leaf?.getViewState?.()?.type === "markdown" &&
      file instanceof TFile &&
      file.extension === "md"
    ) {
      return file;
    }
    return null;
  }

  async openQuickCapture() {
    const file = await this.getQuickCaptureTarget();
    if (!(file instanceof TFile)) {
      new Notice("Abre la nota donde quieres guardar la captura rápida.", 6000);
      return;
    }
    new QuickCaptureModal(this, file).open();
  }

  async appendQuickCapture(file, text, kind = "nota") {
    const timestamp = moment().format("HH:mm");
    const singleLine = text.replace(/\s+/g, " ").trim();
    const labels = {
      nota: "Nota",
      duda: "Duda",
      pendiente: "Pendiente",
      importante: "Importante",
    };
    const label = labels[kind] || labels.nota;
    const line =
      kind === "pendiente"
        ? `- [ ] **${timestamp} · ${label}** ${singleLine}`
        : `- **${timestamp} · ${label}** ${singleLine}`;
    await this.app.vault.process(file, (content) =>
      appendLineToSection(content, "## Capturas rápidas", line)
    );
    await this.openForWriting(file);
    new Notice("Captura rápida guardada.", 3000);
  }

  async insertClassCloseout() {
    const file = await this.getQuickCaptureTarget();
    if (!(file instanceof TFile)) {
      new Notice("Abre un apunte o crea uno antes de insertar el cierre.", 6000);
      return;
    }

    const content = await this.app.vault.read(file);
    const heading = "## Cierre de clase";
    if (sectionBounds(content, heading)) {
      await this.openForWriting(file);
      new Notice("Este apunte ya tiene cierre de clase.", 4000);
      return;
    }

    const block = `${heading}

### Ideas clave
- 
- 
- 

### Dudas
- [ ] 

### Pendientes
- [ ] Repasar este apunte

### Próxima acción
- 
`;
    await this.app.vault.process(file, (current) =>
      `${current.trimEnd()}\n\n${block}`
    );
    await this.openForWriting(file);
    new Notice("Cierre de clase insertado.", 3000);
  }

  async vincularNotaConHoy() {
    const file = this.app.workspace.getActiveFile();
    if (!(file instanceof TFile)) {
      new Notice("No hay ninguna nota activa.", 5000);
      return;
    }
    if (this.isDailyFile(file)) {
      new Notice("Esta nota ya es la nota del día.", 5000);
      return;
    }

    const today = moment().format("YYYY-MM-DD");
    const dayFile = await this.getOrCreateDailyFile(today);
    if (dayFile.path === file.path) {
      new Notice("Esta nota ya es la nota del día.", 5000);
      return;
    }

    const cached =
      this.app.metadataCache.getFileCache(file)?.frontmatter || {};
    const ramo = String(cached.ramo || "").trim();
    const heading = ramo ? `## ${ramo}` : "## Continuaciones";

    const noteLink = `[[${withoutExtension(file.path)}|${file.basename}]]`;
    const currentDay = await this.app.vault.read(dayFile);
    if (!currentDay.includes(noteLink)) {
      await this.app.vault.process(dayFile, (content) =>
        appendLinkToSection(content, heading, noteLink)
      );
    }
    await this.normalizeDailyNote(dayFile);

    const dayLink = `[[${withoutExtension(dayFile.path)}|${today}]]`;
    const currentNote = await this.app.vault.read(file);
    if (!currentNote.includes(dayLink)) {
      await this.app.vault.process(file, (content) =>
        appendLinkToSection(content, "## Continuaciones", dayLink)
      );
    }

    new Notice(`Nota vinculada con hoy (${today}).`, 5000);
  }
};
