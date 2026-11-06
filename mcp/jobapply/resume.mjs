/**
 * Renders a one-page Word resume (.docx) from profile.json plus projects from the jobapply
 * bank, in the EA layout: plain name, status line, company/dates over an italic role,
 * **bold** keywords, underlined project links and tight bullet lists. Word itself reports
 * the page count, since a resume has to fit on one page.
 */
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, HeadingLevel, LevelFormat, Packer, Paragraph, Tab, TabStopType, TextRun,
} from "docx";

const run = promisify(execFile);

// ---------- layout (sizes in half-points, distances in twentieths of a point) ----------
const FONT = "Times New Roman";
const MARGIN = 720; // 0.5in on US Letter
const TEXT_WIDTH = 12240 - 2 * MARGIN;
const INDENT = 144; // entries sit slightly inside the section rules
const SIZE = { name: 50, section: 24, entry: 22, body: 20 };
const BULLETS = "resume-bullets";

const fullUrl = (u) => (/^[a-z]+:/i.test(u) ? u : "https://" + u);
const curly = (s) => String(s ?? "").replace(/"([^"]*)"/g, "“$1”");

/** "Cut **cost by 65%** today" -> runs with the marked parts in bold. */
function rich(s, base = {}) {
  return curly(s)
    .split(/\*\*(.+?)\*\*/)
    .map((part, i) => (part ? new TextRun({ ...base, text: part, bold: i % 2 === 1 || base.bold }) : null))
    .filter(Boolean);
}

/** A line with left content and right-aligned content, as a real tab stop (no tables, so ATS parsers read it in order). */
function splitLine(left, right, { after = 0, before = 0, rightRun = {} } = {}) {
  return new Paragraph({
    indent: { left: INDENT, right: INDENT },
    spacing: { before, after },
    keepNext: true,
    tabStops: [{ type: TabStopType.RIGHT, position: TEXT_WIDTH - INDENT }],
    children: [...left, ...(right ? [new TextRun({ ...rightRun, children: [new Tab(), curly(right)] })] : [])],
  });
}

const sectionHeading = (title) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(title)] });

const subheading = (topLeft, topRight, bottomLeft, bottomRight) => [
  splitLine([new TextRun({ text: curly(topLeft), bold: true, size: SIZE.entry })], topRight, { before: 50, rightRun: { size: SIZE.entry } }),
  splitLine([new TextRun({ text: curly(bottomLeft), italics: true })], bottomRight, { rightRun: { italics: true } }),
];

const bullets = (list) =>
  (list || []).map((b) => new Paragraph({ numbering: { reference: BULLETS, level: 0 }, indent: { right: INDENT }, children: rich(b) }));

function projectHeading(p) {
  const run = { text: curly(p.title), bold: true };
  const title = p.link
    ? new ExternalHyperlink({ link: fullUrl(p.link), children: [new TextRun({ ...run, underline: {} })] })
    : new TextRun(run);
  const tech = p.tech.length ? [new TextRun(" | "), new TextRun({ text: curly(p.tech.join(", ")), italics: true })] : [];
  return splitLine([title, ...tech], p.dates, { before: 50 });
}

function contactLine(contact) {
  const out = [];
  contact.forEach((c, i) => {
    if (i) out.push(new TextRun(" | "));
    out.push(c.url ? new ExternalHyperlink({ link: fullUrl(c.url), children: [new TextRun({ text: c.text, underline: {} })] }) : new TextRun(c.text));
  });
  return out;
}

/**
 * @param {object} o
 * @param {any} o.profile  profile.json
 * @param {{ title: string, dates?: string, link?: string, tech: string[], bullets: string[] }[]} o.projects  in resume order
 * @param {any[]} o.experience  profile.experience, with any per-job bullet rewrites already applied
 * @param {{ label: string, items: string }[]} o.skills
 * @param {string} [o.graduation]  graduation date for this resume; omit for each entry's first `graduation` option
 * @returns {Promise<Buffer>} the .docx file
 */
export async function renderResume({ profile, projects, experience, skills, graduation }) {
  const body = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: profile.name, bold: true, size: SIZE.name })] }),
    ...(profile.headerNote ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(profile.headerNote)] })] : []),
    new Paragraph({ alignment: AlignmentType.CENTER, children: contactLine(profile.contact) }),
  ];

  body.push(sectionHeading("Education"));
  for (const e of profile.education) {
    // Entries with `graduation` options show "start – <chosen date>"; others keep fixed `dates`.
    const dates = e.graduation?.length ? `${e.start} – ${graduation || e.graduation[0]}` : e.dates;
    body.push(...subheading(e.school, e.location, e.degree, dates), ...bullets(e.bullets));
  }

  if (experience.length) {
    body.push(sectionHeading("Experience"));
    for (const x of experience) body.push(...subheading(x.company, x.dates, x.title, x.location || ""), ...bullets(x.bullets));
  }

  body.push(sectionHeading("Projects"));
  for (const p of projects) body.push(projectHeading(p), ...bullets(p.bullets));

  body.push(sectionHeading("Technical Skills"));
  for (const s of skills) {
    body.push(new Paragraph({ indent: { left: INDENT, right: INDENT }, children: [new TextRun({ text: curly(s.label), bold: true }), new TextRun(": "), ...rich(s.items)] }));
  }

  // The file goes to employers, so its properties name only the candidate.
  const doc = new Document({
    creator: profile.name,
    lastModifiedBy: profile.name,
    title: `${profile.name} Resume`,
    compatibility: { version: 15 },
    styles: {
      default: {
        document: { run: { font: FONT, size: SIZE.body }, paragraph: { spacing: { before: 0, after: 0, line: 240 } } },
        heading1: {
          run: { font: FONT, size: SIZE.section, smallCaps: true, color: "000000" },
          paragraph: {
            spacing: { before: 110, after: 30 },
            keepNext: true,
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, space: 1, color: "000000" } },
          },
        },
      },
    },
    numbering: {
      config: [{
        reference: BULLETS,
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: INDENT + 260, hanging: 180 } } } }],
      }],
    },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN, header: 0, footer: 0 } } },
      children: body,
    }],
  });
  return Packer.toBuffer(doc);
}

// ---------- files ----------
const safeName = (s) => String(s).replace(/[<>:"/\\|?*\x00-\x1f]/g, "").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "").slice(0, 80);

/** Write the .docx into <dir>/<Company> - <Role>/ and have Word count its pages. */
export async function saveResume({ dir, company, role, name, buffer }) {
  const folder = path.join(dir, safeName(`${company} - ${role}`) || "Resume");
  await mkdir(folder, { recursive: true });
  const docxPath = path.join(folder, `${safeName(name).replace(/\s+/g, "_") || "Resume"}_Resume.docx`);
  try {
    await writeFile(docxPath, buffer);
  } catch (err) {
    if (err.code === "EBUSY" || err.code === "EPERM") throw new Error(`Can't overwrite ${docxPath}; it's probably open in Word. Close it and call write_resume again.`);
    throw err;
  }
  return { folder, docxPath, ...(await pageInfo(docxPath)) };
}

// Runs against a private, hidden Word instance. The path arrives through the environment so
// nothing in a company or role name can reach the script.
const WORD_PAGE_COUNT = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$word = $null
$doc = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $doc = $word.Documents.Open([ref]$env:JOBAPPLY_DOCX, [ref]$false, [ref]$true, [ref]$false)
  $doc.ActiveWindow.View.Type = 3
  $doc.Repaginate()
  # Information(4), the laid-out page count; ComputeStatistics can report a stale 1 in a hidden window.
  $pages = $doc.Content.Information(4)
  $overflow = ''
  if ($pages -gt 1) { $overflow = $doc.Range($doc.GoTo([ref]1, [ref]1, [ref]2).Start, $doc.Content.End).Text }
  @{ pages = $pages; overflow = $overflow } | ConvertTo-Json -Compress
} catch {
  @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
} finally {
  if ($doc) { try { $doc.Close([ref]0) } catch {} }
  if ($word) { try { $word.Quit([ref]0) } catch {}; [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
}
`;

/** Page count and the text past page 1, measured by Word. Pages stay undefined when Word can't be run. */
export async function pageInfo(docxPath) {
  const unverified = (why) => ({ pageNote: `Page count NOT verified (${why}). Open the file in Word and confirm it fits on one page.` });
  if (process.platform !== "win32") return unverified("needs Microsoft Word on Windows");
  try {
    const { stdout } = await run(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(WORD_PAGE_COUNT, "utf16le").toString("base64")],
      { env: { ...process.env, JOBAPPLY_DOCX: docxPath }, windowsHide: true, timeout: 90000 },
    );
    const { pages, overflow, error } = JSON.parse(stdout);
    if (error) return unverified(`Word couldn't be run: ${error}`);
    return {
      pages,
      overflow: pages > 1 ? String(overflow).replace(/[\r\x07]+/g, "\n").trim() : undefined,
      pageNote: pages > 1 ? `Word lays this out on ${pages} pages. Trim bullets or drop a project to fit one page; "overflow" is the text past page 1.` : "Word confirms one page.",
    };
  } catch (err) {
    return unverified(`Word couldn't be run: ${String(err.stderr || err.message).slice(0, 300)}`);
  }
}
