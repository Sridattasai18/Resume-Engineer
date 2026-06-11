# Resume Engineer

Tired of sending the same resume to every job and hearing nothing back? Resume Engineer helps you tailor your resume to a specific job description in seconds — AI-powered, runs entirely in your browser, no installations needed.

---

## What it does

Paste your resume, drop in a job description, and it gives you back:
- A tailored LaTeX resume ready to compile
- An ATS score so you know where you stand
- A cover letter written for that specific role
- A checklist to make sure you're actually ready to apply

---

## There are two versions

### Version 2 — use this one
Open `Version2/index.html` directly in your browser. That's it. No server, no setup, no npm.

**Ways to input your resume:**
- **Upload** — drag and drop a PDF, TXT, or MD file
- **LaTeX** — paste your existing LaTeX source
- **Build** — fill in a form if you're starting from scratch

**What you get back:**
- Tailored LaTeX resume (send it to Overleaf to get a PDF)
- ATS score breakdown across 4 categories
- Keywords you're missing vs. keywords you already have
- A cover letter (editable in-browser)
- Line-by-line diff showing what changed
- Alerts for missing sections with an option to let AI fill them in

**API keys:** Supports Gemini (Google AI Studio) and OpenRouter. Keys stay in your browser's localStorage — nothing leaves your device except the API call itself.

---

### Version 1 — the original Flask app
Runs on a Python server locally. Useful if you want a backend-based setup.

```bash
git clone https://github.com/Sridattasai18/Resume-Engineer.git
cd Resume-Engineer
pip install -r requirements.txt
python app.py
```

Then open `http://127.0.0.1:5000` in your browser.

---

## Getting started with Version 2

1. Open `Version2/index.html` in your browser
2. Click **Set API Key** and paste your Gemini or OpenRouter key
3. Pick your input tab, add a job description
4. Hit **Generate**

---

## Your data stays private

- **Version 2**: Keys are stored locally in your browser. API calls go directly from your browser to Google/OpenRouter — nothing passes through any third-party server.
- **Version 1**: Keys live on your local Python server and are never exposed to the browser.
