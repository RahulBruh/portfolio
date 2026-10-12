/**
 * Renders a one-page LaTeX resume from profile.json plus projects from the jobapply bank,
 * in the layout of Rahul_Moka_Resume_EA (Jake Gutierrez's template, restyled): plain name,
 * status line, company/dates over an italic role, **bold** keywords, underlined project
 * links and tight bullet lists. Compiles to PDF when a TeX engine is installed and reports
 * the page count, since a resume has to fit on one page.
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

// ---------- escaping ----------
const SPECIAL = {
  "\\": "\\textbackslash{}", "&": "\\&", "%": "\\%", "$": "\\$", "#": "\\#", "_": "\\_", "{": "\\{", "}": "\\}",
  "~": "\\textasciitilde{}", "^": "\\textasciicircum{}", "<": "\\textless{}", ">": "\\textgreater{}", "|": "\\textbar{}",
};
const UNICODE = {
  "–": "--", "—": "---", "‘": "`", "’": "'", "“": "``", "”": "''", "…": "\\ldots{}", "•": "\\textbullet{}",
  "→": "$\\rightarrow$", "←": "$\\leftarrow$", "×": "$\\times$", "≈": "$\\approx$", "≥": "$\\geq$", "≤": "$\\leq$",
  "±": "$\\pm$", "°": "$^\\circ$", "\u00a0": "~",
};

/** Escape plain text for LaTeX (the template has no fontenc, so < > | need commands too). */
export function tex(s) {
  return String(s ?? "")
    .replace(/[\\&%$#_{}~^<>|]/g, (c) => SPECIAL[c])
    .replace(/"([^"]*)"/g, "``$1''")
    .replace(/[–—‘’“”…•→←×≈≥≤±°\u00a0]/g, (c) => UNICODE[c]);
}

/** tex() plus **bold** -> \textbf{bold}. */
export const rich = (s) => tex(s).replace(/\*\*(.+?)\*\*/g, "\\textbf{$1}");

const texUrl =(u) => String(u).replace(/[\\%#{}]/g, (c) => "\\" + c);
const fullUrl = (u) => (/^[a-z]+:/i.test(u) ? u : "https://" + u);
const shortUrl = (u) => String(u).replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

// ---------- template ----------
const PREAMBLE = String.raw`\documentclass[letterpaper,11pt]{article}

\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage[usenames,dvipsnames]{color}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage[english]{babel}
\usepackage{tabularx}
% pdfTeX only (MiKTeX/TeX Live pdflatex, Overleaf); skipped under XeTeX/tectonic.
\ifdefined\pdfgentounicode
  \input{glyphtounicode}
  \pdfgentounicode=1
\fi

\pagestyle{fancy}
\fancyhf{}
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

\addtolength{\oddsidemargin}{-0.5in}
\addtolength{\evensidemargin}{-0.5in}
\addtolength{\textwidth}{1in}
\addtolength{\topmargin}{-.5in}
\addtolength{\textheight}{1.0in}

\urlstyle{same}
\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}

\titleformat{\section}{
  \vspace{-4pt}\scshape\raggedright\large
}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]

\newcommand{\resumeItem}[1]{
  \item\small{
    {#1 \vspace{-2pt}}
  }
}

\newcommand{\resumeSubheading}[4]{
  \vspace{-2pt}\item
    \begin{tabular*}{0.97\textwidth}[t]{l@{\extracolsep{\fill}}r}
      \textbf{#1} & #2 \\
      \textit{\small#3} & \textit{\small #4} \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeProjectHeading}[2]{
    \item
    \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
      \small#1 & #2 \\
    \end{tabular*}\vspace{-7pt}
}

\renewcommand\labelitemii{$\vcenter{\hbox{\tiny$\bullet$}}$}

\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.15in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}[itemsep=0pt, parsep=0pt, topsep=2pt]}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}
`;

function items(bullets) {
  if (!bullets || !bullets.length) return "";
  return "      \\resumeItemListStart\n" + bullets.map((b) => `        \\resumeItem{${rich(b)}}`).join("\n") + "\n      \\resumeItemListEnd\n";
}

/**
 * @param {object} o
 * @param {any} o.profile  profile.json
 * @param {{ title: string, dates?: string, link?: string, tech: string[], bullets: string[] }[]} o.projects  in resume order
 * @param {any[]} o.experience  profile.experience, with any per-job bullet rewrites already applied
 * @param {{ label: string, items: string }[]} o.skills
 * @param {string} [o.comment]  goes at the top of the file
 */
export function renderResume({ profile, projects, experience, skills, comment }) {
  const contact = profile.contact
    .map((c) => (c.url ? `\\href{${texUrl(fullUrl(c.url))}}{\\underline{${tex(c.text)}}}` : tex(c.text)))
    .join(" $|$ ");

  const out = [];
  if (comment) out.push(comment.split("\n").map((l) => "% " + l).join("\n"), "");
  out.push(PREAMBLE, "\\begin{document}", "");
  out.push(
    "\\begin{center}",
    `    \\textbf{\\Huge ${tex(profile.name)}} \\\\ \\vspace{1pt}`,
    ...(profile.headerNote ? [`    \\small ${tex(profile.headerNote)} \\\\ \\vspace{1pt}`] : []),
    `    \\small ${contact}`,
    "\\end{center}",
    "",
  );

  out.push("\\section{Education}", "  \\resumeSubHeadingListStart");
  for (const e of profile.education) {
    out.push(`    \\resumeSubheading\n      {${tex(e.school)}}{${tex(e.location)}}\n      {${tex(e.degree)}}{${tex(e.dates)}}`);
    out.push(items(e.bullets).trimEnd());
  }
  out.push("  \\resumeSubHeadingListEnd", "");

  if (experience.length) {
    out.push("\\section{Experience}", "  \\resumeSubHeadingListStart");
    for (const x of experience) {
      out.push(`    \\resumeSubheading\n      {${tex(x.company)}}{${tex(x.dates)}}\n      {${tex(x.title)}}{${tex(x.location || "")}}`);
      out.push(items(x.bullets).trimEnd());
    }
    out.push("  \\resumeSubHeadingListEnd", "");
  }

  out.push("\\section{Projects}", "    \\resumeSubHeadingListStart");
  for (const p of projects) {
    const title = p.link ? `\\href{${texUrl(fullUrl(p.link))}}{\\underline{\\textbf{${tex(p.title)}}}}` : `\\textbf{${tex(p.title)}}`;
    const tech = p.tech.length ? ` $|$ \\emph{${tex(p.tech.join(", "))}}` : "";
    out.push(`      \\resumeProjectHeading\n          {${title}${tech}}{${tex(p.dates || "")}}`);
    out.push(items(p.bullets).trimEnd());
  }
  out.push("    \\resumeSubHeadingListEnd", "");

  out.push(
    "\\section{Technical Skills}",
    " \\begin{itemize}[leftmargin=0.15in, label={}]",
    "    \\small{\\item{",
    skills.map((s) => `     \\textbf{${tex(s.label)}}{: ${rich(s.items)}}`).join(" \\\\\n"),
    "    }}",
    " \\end{itemize}",
    "",
    "\\end{document}",
    "",
  );
  return out.filter((l) => l !== "").join("\n").replace(/\n(\\section)/g, "\n\n$1").replace(/\n(\\end\{document\})/, "\n\n$1") + "\n";
}

// ---------- files ----------
const safeName = (s) => String(s).replace(/[<>:"/\\|?*\x00-\x1f]/g, "").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "").slice(0, 80);

/** Write the .tex into <dir>/<Company> - <Role>/ and try to build the PDF there. */
export async function saveResume({ dir, company, role, name, source }) {
  const folder = path.join(dir, safeName(`${company} - ${role}`) || "Resume");
  await mkdir(folder, { recursive: true });
  const base = `${safeName(name).replace(/\s+/g, "_") || "Resume"}_Resume`;
  const texPath = path.join(folder, base + ".tex");
  await writeFile(texPath, source, "utf8");
  return { folder, texPath, ...(await compile(folder, base)) };
}

/** pdflatex on PATH, MiKTeX's default per-user install, or tectonic (PATH or %LOCALAPPDATA%\Programs\tectonic). */
async function findEngine() {
  const programs = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "Programs");
  const miktex = path.join(programs, "MiKTeX", "miktex", "bin", "x64", "pdflatex.exe");
  const tectonic = path.join(programs, "tectonic", "tectonic.exe");
  const candidates = [
    process.env.JOBAPPLY_LATEX,
    "pdflatex",
    existsSync(miktex) ? miktex : null,
    "tectonic",
    existsSync(tectonic) ? tectonic : null,
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      await run(c, ["--version"], { windowsHide: true, timeout: 15000 });
      return c;
    } catch { /* not installed */ }
  }
  return null;
}

async function compile(folder, base) {
  const engine = await findEngine();
  if (!engine) {
    return {
      pdfPath: null,
      compileNote: "No LaTeX engine found, so only the .tex was written. Install MiKTeX (winget install MiKTeX.MiKTeX) or tectonic, " +
        "or upload the .tex to Overleaf. Set JOBAPPLY_LATEX to point at an engine elsewhere.",
    };
  }
  const isTectonic = /tectonic/i.test(path.basename(engine));
  const args = isTectonic
    ? ["--keep-logs", base + ".tex"]
    : ["-interaction=nonstopmode", "-halt-on-error", "-file-line-error", base + ".tex"];
  const pdfPath = path.join(folder, base + ".pdf");
  try {
    await run(engine, args, { cwd: folder, windowsHide: true, timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
  } catch (err) {
    const log = await readFile(path.join(folder, base + ".log"), "utf8").catch(() => String(err.stdout || err.message));
    const errors = log.split(/\r?\n/).filter((l) => /^!|:\d+:|Error/.test(l)).slice(0, 12).join("\n");
    return { pdfPath: null, compileNote: `${path.basename(engine)} failed:\n${errors || log.slice(-2000)}` };
  }
  if (!existsSync(pdfPath)) return { pdfPath: null, compileNote: `${path.basename(engine)} ran but wrote no PDF.` };
  const { pages, overflow } = await pageInfo(pdfPath);
  return {
    pdfPath,
    pages,
    overflow: overflow || undefined,
    compileNote: pages > 1 ? `The PDF is ${pages} pages. Trim bullets or drop a project to fit one page; "overflow" is the text past page 1.` : "Compiled to one page.",
  };
}

/** Page count, and the text that spilled past page 1. */
export async function pageInfo(pdfPath) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(await readFile(pdfPath)));
  if (pdf.numPages <= 1) return { pages: pdf.numPages, overflow: "" };
  const { text } = await extractText(pdf, { mergePages: false });
  return { pages: pdf.numPages, overflow: text.slice(1).join("\n").trim() };
}
