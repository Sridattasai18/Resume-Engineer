# Resume Engineer

> **Tailor your resume to clear the ATS machine in one shot.**

Resume Engineer is an interactive AI-powered resume customization assistant designed specifically for developers, software engineers, and data scientists. By matching your base resume (either raw LaTeX code, plain text, or a PDF upload) against a target Job Description, it generates an optimized LaTeX resume, compiles a targeted cover letter, displays a side-by-side diff of tailored enhancements, and runs an ATS simulation report—all in one shot.

---

## Versions & Releases

This repository contains two main versions of the application:

### 🚀 Version 2 (Latest — Recommended)
Located in [`Version2/index.html`](file:///c:/Users/kalig/OneDrive/Desktop/Jar/RE-V2/Version2/index.html).
- **Architecture**: Single-file, client-side only serverless web application (HTML + CSS + JS in a single file).
- **Prerequisites**: None! Double-click `Version2/index.html` to open it in your browser directly (no server, no node, no npm required).
- **Features**:
  - **3 Input Tabs**:
    1. **Source**: Drag & drop PDF/TXT/MD files (text extracted client-side via `PDF.js`) or paste raw resume text.
    2. **LaTeX**: Directly paste your LaTeX base code (AI tailors it end-to-end).
    3. **Build**: Fill in accordion form builder fields manually.
  - **API Keys**: Supports **Google AI Studio (Gemini API)** and **OpenRouter** (supporting 5 models) stored securely inside browser `localStorage`.
  - **ATS Score Donut Chart**: Animated SVG loading progress ring showing match score thresholds (PASS/BORDERLINE/FAIL).
  - **ATS Sub-Scores**: 4 cards detailing Keyword Density, ATS Formatting, Section Order, and Readability & Bullets out of 25.
  - **3-Layer Keyword Chips**: Visualizes present (green), missing (red), and suggested click-to-copy additions (blue) with toast confirmations.
  - **Actionable Improvements**: 5-8 recommendations prioritizing fixes by severity (HIGH/MED/LOW).
  - **Line-by-Line Monospace Diff**: Collapsible colored diff showing added (+) and removed (-) LaTeX lines.
  - **Missing Section Warnings**: Warning chips offering [AI Fill] (triggers a secondary targeted JSON API query), [Fill Myself] (focuses and scrolls to the form builder accordion), or [Skip].
  - **Pre-Apply Checklist**: Verifies 7 criteria for a final "Ready to Apply ✅" indicator.
  - **Cover Letter Editor**: Inline editor showing word counts and warnings if letter length > 220 words.
  - **Overleaf Integration**: Submit the customized LaTeX directly to the Overleaf editor snip compiler.

### 🐍 Version 1 (Classic Flask Server)
Located in the repository root (`app.py`, `templates/`, `static/`).
- **Architecture**: Server-based Flask (Python) web application.
- **Prerequisites**: Python 3.8+ installed, package configuration via `requirements.txt`.
- **Features**: Extracts text from PDF uploads server-side using `pypdf`, and queries model handlers on the backend.

---

## Quick Start (Version 2)

1. Open [`Version2/index.html`](file:///c:/Users/kalig/OneDrive/Desktop/Jar/RE-V2/Version2/index.html) in your browser.
2. Enter your API Key in the Settings Modal (Gemini API key from Google AI Studio is recommended).
3. Set your input tab (**Source**, **LaTeX**, or **Build**) and add your target Job Description.
4. Click **Generate** and view your optimized LaTeX, ATS report, and cover letter.

---

## Quick Start (Version 1 — Flask App)

### 1. Installation
Clone the repository and install the Python requirements:
```bash
git clone https://github.com/Sridattasai18/Resume-Engineer.git
cd Resume-Engineer
pip install -r requirements.txt
```

### 2. Configure Environment (Optional)
Specify your Gemini key as an environment variable to use it as the backend fallback default:
```bash
# On Windows (CMD)
set GEMINI_API_KEY=your-gemini-api-key

# On Windows (PowerShell)
$env:GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Run Server
```bash
python app.py
```
Open **`http://127.0.0.1:5000`** in your browser.

---

## Security & Key Handling

Your API credentials are safe:
- **Version 2**: All keys are stored client-side in browser `localStorage`. API calls are dispatched directly to the model endpoints from your browser. Nothing is sent to external trackers or secondary servers.
- **Version 1**: Env keys are handled entirely on the server-side inside Python, meaning your credentials are never exposed to the client browser source code.
