# Resume Engineer v4 — Implementation Prompt

> Give this to Claude along with your current v4.html file attached.
> Claude will produce a single complete v4.html file.

---

```
You are a senior frontend engineer. I have an existing single-file HTML
web app called Resume Engineer v4 (v4.html attached). Your job is to
upgrade it to v4 with specific navigation and input flow changes.
Keep it as a single HTML file — HTML + CSS + JS all in one, no build
step, no npm, no external JS libraries except PDF.js CDN which is
already included.

Read the entire v4.html carefully before writing a single line.
Understand every existing function, CSS variable, and ID before
changing anything. Do not break anything that currently works.

---

## WHAT IS CHANGING — OVERVIEW

The three nav tabs are being renamed and restructured:

OLD:  [ LaTeX ] [ Build ] [ Upload ]
NEW:  [ Source ] [ LaTeX ] [ Build ]

Each tab has a distinct purpose:

- SOURCE: replaces the old Upload tab. Handles raw resume input via
  file upload OR plain text paste. Sends raw content to the AI.

- LATEX: keeps the old LaTeX textarea. Sends raw LaTeX to the AI.
  No parsing into form fields.

- BUILD: keeps the existing accordion form exactly as-is.
  User manually fills in details. Sends structured form data to AI.

---

## CHANGE 1 — NAV TAB RENAME AND REORDER

### In the HTML navbar (.nav-mid):
Replace the current three nav buttons with these exactly:

  <button class="ntab on" id="mbS" onclick="setMode('source')">Source</button>
  <button class="ntab" id="mbL" onclick="setMode('latex')">LaTeX</button>
  <button class="ntab" id="mbB" onclick="setMode('build')">Build</button>

### In the mobile nav row:
DELETE the entire #mobile-mode div completely. Do not replace it.
Remove all HTML for it. Remove all JS references to mmL, mmF, mmP.
The main nav already works responsively — no duplicate needed.

### In setMode(m) JavaScript function:
- Old mode values: 'latex', 'form', 'pdf'
- New mode values: 'source', 'latex', 'build'
- Update ALL references throughout the entire JS:
  - mode === 'latex' → stays 'latex'
  - mode === 'form' → becomes 'build'
  - mode === 'pdf' → becomes 'source'
  - All getElementById calls for mode-latex, mode-form, mode-pdf
    → rename to mode-source, mode-latex, mode-build
  - All JD textarea IDs: jd-latex, jd-pdf, jd-form
    → rename to jd-latex, jd-source, jd-build
  - All fallback div IDs: fallback-latex, fallback-pdf, fallback-form
    → rename to fallback-latex, fallback-source, fallback-build
  - All role/ind input IDs: role-latex/ind-latex, role-pdf/ind-pdf,
    role-form/ind-form
    → rename to role-latex/ind-latex, role-source/ind-source,
    role-build/ind-build
  - Template list IDs: tl-latex, tl-pdf, tl-form
    → rename to tl-latex, tl-source, tl-build
  - Toggle checkbox IDs: tc-l, tc-p, tc-f and td-l, ta-l, ta-p, ta-f
    → rename to tc-source, tc-latex, tc-build and
    td-latex, ta-source, ta-latex, ta-build

---

## CHANGE 2 — SOURCE TAB (replaces old Upload tab)

### HTML structure for #mode-source:
Replace the entire #mode-pdf div with this new #mode-source div.

The Source tab has two sub-modes toggled by a pill switch inside
the tab:

  [ 📁 Upload File ] [ 📋 Paste Text ]

Default active: Upload File.

Structure:

<div id="mode-source" style="display:none">

  <!-- Sub-mode toggle -->
  <div class="source-toggle">
    <button class="stab on" id="stab-upload"
      onclick="setSourceMode('upload')">📁 Upload File</button>
    <button class="stab" id="stab-paste"
      onclick="setSourceMode('paste')">📋 Paste Text</button>
  </div>

  <!-- Upload sub-mode (default visible) -->
  <div id="source-upload-pane">
    <!-- KEEP entire existing dropzone HTML from old #mode-pdf exactly:
         pdf-dropzone, file-input, pdf-err, pdf-preview-box,
         pdf-meta-name, pdf-meta-size, pdf-meta-remove, pdf-note -->
  </div>

  <!-- Paste sub-mode (default hidden) -->
  <div id="source-paste-pane" style="display:none">
    <div class="form-group">
      <label class="form-lbl">Paste Resume Text</label>
      <textarea id="source-paste-input" rows="14"
        placeholder="Paste your resume content here — plain text,
copied from a PDF, from LinkedIn, from Word, or any format.
The AI will parse and structure it automatically."></textarea>
    </div>
  </div>

  <!-- Parsed banner (hidden until parse succeeds) -->
  <div class="parse-banner hidden" id="source-parse-banner">
    <span>✓ Resume content loaded</span>
    <button onclick="setMode('build')" class="parse-view-btn">
      View in Build →
    </button>
  </div>

  <!-- JD, fallback fields, template, options — same as other tabs -->
  <div class="form-group">
    <label class="form-lbl">Job Description</label>
    <textarea id="jd-source" rows="8"
      placeholder="Paste the full job posting here…"></textarea>
    <div class="jd-fallback-fields" id="fallback-source"
      style="display:none;">
      <div class="fg" style="margin-bottom: 8px;">
        <div class="ff"><label>Target Role (Optional)</label>
          <input type="text" id="role-source"
          placeholder="e.g. Software Engineer"></div>
        <div class="ff"><label>Industry/Domain (Optional)</label>
          <input type="text" id="ind-source"
          placeholder="e.g. FinTech, Healthcare"></div>
      </div>
      <div id="tooltip-source" style="font-size:11px;
        color:var(--muted);display:none;padding-top:4px;">
        ℹ️ AI will infer role and keywords from your resume content.
      </div>
    </div>
  </div>
  <div class="form-group">
    <label class="form-lbl">Template</label>
    <div class="tpl-list" id="tl-source"></div>
  </div>
  <div class="form-group">
    <label class="form-lbl">Options</label>
    <div class="tog-row"><span class="tog-lbl">Generate cover
      letter</span><label class="tog"><input type="checkbox"
      id="tc-source" checked><div class="tog-tr"></div>
      <div class="tog-th"></div></label></div>
    <div class="tog-row"><span class="tog-lbl">ATS keyword
      analysis</span><label class="tog"><input type="checkbox"
      id="ta-source" checked><div class="tog-tr"></div>
      <div class="tog-th"></div></label></div>
  </div>

</div>

### CSS for source-toggle and parse-banner:
Add these styles to the <style> block:

.source-toggle {
    display: flex;
    border: 1px solid var(--hairline);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 20px;
    width: fit-content;
}
.stab {
    padding: 6px 16px;
    font-size: 11.5px;
    font-weight: 500;
    cursor: pointer;
    background: transparent;
    border: none;
    color: var(--muted);
    border-right: 1px solid var(--hairline);
    font-family: var(--sans);
    transition: all .12s;
}
.stab:last-child { border-right: none; }
.stab.on { background: var(--ink); color: var(--paper); }
.stab:hover:not(.on) { background: var(--paper2); color: var(--ink); }

.parse-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--accent-bg);
    border: 1px solid var(--accent);
    border-radius: 3px;
    padding: 10px 14px;
    font-size: 12.5px;
    color: var(--accent-txt);
    margin-bottom: 20px;
    animation: fadeup .22s var(--ease);
}
.parse-banner.hidden { display: none; }
.parse-view-btn {
    font-family: var(--mono);
    font-size: 9px;
    letter-spacing: .14em;
    text-transform: uppercase;
    padding: 4px 10px;
    border: 1px solid var(--accent);
    border-radius: 3px;
    background: transparent;
    color: var(--accent-txt);
    cursor: pointer;
    transition: all .12s;
}
.parse-view-btn:hover {
    background: var(--accent);
    color: var(--paper);
}

### JavaScript for setSourceMode(m):
Add this new function:

function setSourceMode(m) {
    var uploadPane = document.getElementById('source-upload-pane');
    var pastePane = document.getElementById('source-paste-pane');
    var tabUpload = document.getElementById('stab-upload');
    var tabPaste = document.getElementById('stab-paste');

    if (m === 'upload') {
        uploadPane.style.display = 'block';
        pastePane.style.display = 'none';
        tabUpload.classList.add('on');
        tabPaste.classList.remove('on');
    } else {
        uploadPane.style.display = 'none';
        pastePane.style.display = 'block';
        tabPaste.classList.add('on');
        tabUpload.classList.remove('on');
    }
}

---

## CHANGE 3 — LATEX TAB (minor update only)

The LaTeX tab keeps its existing textarea and all options.
Only changes needed:

1. The HTML div id changes from #mode-latex → stays #mode-latex
   (no change here, already correct name).

2. Add a small info note below the LaTeX textarea:
   <p style="font-size:11px; color:var(--muted); margin-top:6px;">
     Your LaTeX will be sent directly to the AI for tailoring.
     No client-side parsing — the AI handles it end-to-end.
   </p>

3. The "Show diff vs base" toggle (td-latex / td-l) stays exactly
   as-is. Only the ID reference updates as noted in CHANGE 1.

---

## CHANGE 4 — BUILD TAB (minor rename only)

The Build tab is the old Form/Build accordion. No structural
changes to the form fields, accordion sections, or entry cards.

Only changes:
1. The HTML div id changes: #mode-form → #mode-build
2. All JS references to mode-form → mode-build (covered in CHANGE 1)
3. The tab is now the third tab, not the second.
4. Default active tab on page load changes from 'latex' to 'source'
   (Source is now the first and default tab).

---

## CHANGE 5 — RESUME MODE INDICATOR PILL

Add a small persistent pill in the nav that always shows which
input mode is currently active.

### HTML — add inside .nav-r div, before the API key button:
<div class="mode-pill" id="mode-pill">
    <span class="mode-pill-dot"></span>
    <span class="mode-pill-lbl" id="mode-pill-lbl">Source</span>
</div>

### CSS:
.mode-pill {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border: 1px solid var(--hairline);
    border-radius: 999px;
    font-family: var(--mono);
    font-size: 9px;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--muted);
    background: var(--paper2);
    transition: all .2s;
}
.mode-pill-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
}

### JavaScript — update setMode() to call this after switching:
function updateModePill(m) {
    var labels = { source: 'Source', latex: 'LaTeX', build: 'Build' };
    var pill = document.getElementById('mode-pill-lbl');
    if (pill) pill.textContent = labels[m] || m;
}

Call updateModePill(m) at the end of setMode(m).

---

## CHANGE 6 — GENERATE FUNCTION INPUT RESOLUTION

Update the generate() function to correctly read from all three
new modes. Replace the old input resolution block with this logic:

var isS = mode === 'source';
var isL = mode === 'latex';
var isB = mode === 'build';

// Get JD based on active mode
var jd = (isL ? gv('jd-latex') : isS ? gv('jd-source') :
          gv('jd-build')).trim();

// Get resume content based on active mode
var resume = '';
if (isL) {
    resume = gv('latex-input').trim();
} else if (isS) {
    // Check which source sub-mode is active
    var pastePane = document.getElementById('source-paste-pane');
    if (pastePane && pastePane.style.display !== 'none') {
        // Paste mode
        resume = gv('source-paste-input').trim();
    } else {
        // Upload mode
        resume = fileText.trim();
    }
} else {
    // Build mode
    resume = buildForm().trim();
}

// Get active role/industry fallback fields
var activeRole = gv('role-' + mode).trim();
var activeInd = gv('ind-' + mode).trim();

// Validation
if (!jd && !activeRole && !activeInd) {
    alert('Please provide at least a Job Description, a Target Role,
or an Industry.');
    return;
}
if (isS) {
    var pastePane2 = document.getElementById('source-paste-pane');
    var isPaste = pastePane2 && pastePane2.style.display !== 'none';
    if (!isPaste && !fileText) {
        alert('Please upload a file first (PDF, TXT, or MD).');
        return;
    }
    if (isPaste && !resume) {
        alert('Please paste your resume text first.');
        return;
    }
}
if (isL && !resume) {
    alert('Please paste your LaTeX resume.');
    return;
}
if (isB && !resume) {
    alert('Please fill in at least your basic details.');
    return;
}

// input_mode for the AI system prompt
var aiInputMode = isL ? 'latex' : isB ? 'form' : 'upload';

// Get toggles
var wC = tv(isL ? 'tc-latex' : isS ? 'tc-source' : 'tc-build');
var wD = isL && tv('td-latex');

// Get selected template
var activeLid = isL ? 'tl-latex' : isS ? 'tl-source' : 'tl-build';
var activeTplEl = document.querySelector(
    '#' + activeLid + ' .tpl-item.sel');
if (activeTplEl) selTpl = activeTplEl.dataset.id;

---

## CHANGE 7 — MISSING SECTION RECOVERY scrollToSection UPDATE

The scrollToSection(sec) function currently calls setMode('form').
Update it to call setMode('build') instead:

function scrollToSection(sec) {
    setMode('build');   // ← was setMode('form')
    // ... rest of function stays identical
}

---

## CHANGE 8 — INIT AND DEFAULT MODE

At the bottom of the script, in the init block:
1. Remove the call to setMode('latex') or any default mode set.
2. Add: setMode('source'); as the default on page load.
3. initTpls() must now initialize 'tl-source', 'tl-latex',
   'tl-build' (update the array in initTpls accordingly).
4. updateJDFallbacks() event listener setup — update the mode
   array from ['latex', 'pdf', 'form'] to
   ['latex', 'source', 'build'] everywhere it appears.

---

## CHANGE 9 — PARSE BANNER TRIGGER

When a file is successfully loaded/extracted in Source upload mode,
OR when text is pasted in Source paste mode (on input event with
content length > 50 chars), show the parse banner:

function showSourceParseBanner() {
    var banner = document.getElementById('source-parse-banner');
    if (banner) banner.classList.remove('hidden');
}

Call showSourceParseBanner():
- In showFileMeta() — after file metadata is displayed
- In source-paste-input's input event listener when
  value.trim().length > 50

---

## THINGS TO STRICTLY NOT CHANGE

1. The entire settings modal — provider tabs, model dropdown,
   API key inputs, localStorage keys. Leave exactly as-is.
2. The AI system prompt string inside generate(). Leave exactly as-is.
3. The TPLS array and HINTS object. Leave exactly as-is.
4. The renderResults() function. Leave exactly as-is.
5. The parsePDF() function. Leave exactly as-is.
6. The extractTextFromPdf() function. Leave exactly as-is.
7. The donut ring SVG chart rendering. Leave exactly as-is.
8. All CSS variables (--paper, --ink, --accent, etc.). Leave as-is.
9. The floating CTA Generate button. Leave exactly as-is.
10. Dark mode logic. Leave exactly as-is.
11. The FAQ section. Leave exactly as-is.
12. The hero section. Leave exactly as-is.
13. The error banner logic. Leave exactly as-is.
14. The progress bar animation. Leave exactly as-is.
15. The STEPS array and step animation. Leave exactly as-is.

---

## OUTPUT FORMAT

Produce a single complete v4.html file.
All HTML, CSS, and JS in one file.
No external dependencies except Google Fonts CDN and PDF.js CDN
(both already present in v4.html — keep exact same CDN URLs).
File must work by opening directly in a browser (no server needed).
Comment every changed or new JS function with:
  // [v4] description of what changed

After the complete file, provide a short summary:
1. Every change made and which line/function it affected
2. Any v4 behavior you had to adjust to make the new flow work
3. Any edge cases I should test manually
```