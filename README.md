# Resume Engineer ⚡

> **Tailor your resume to clear the ATS machine in one shot.**

Resume Engineer is an interactive AI-powered resume customization assistant designed specifically for early-career developers, SWEs, and data scientists. By matching your base resume (either raw LaTeX code or a PDF upload) against a target Job Description, it generates an optimized LaTeX resume, compiles a targeted cover letter, displays a side-by-side diff of tailored enhancements, and runs an ATS simulation report—all in one shot.

---

## 🛠️ Architecture & Tech Stack

Following a robust backend refactor, the application uses a structured client-server architecture:

- **Backend (Server-side)**: Built with **Flask (Python)**. It processes requests, communicates securely with upstream LLM providers, and extracts plain text from binary PDF uploads using `pypdf` on the server.
- **Frontend (Client-side)**: A modern, responsive UI built with **Vanilla HTML, CSS, and JS**.
- **Supported AI Providers**: Gemini, OpenRouter, Claude, and OpenAI.
- **Aesthetic**: Premium, responsive dark/light mode, custom animations, and clean, modern typography.

---

## 🔒 Security First: Key Handling

Your API keys are safe. 
- Local keys are saved directly in your browser's `localStorage` and never stored on the server.
- **Gemini Free Tier**: Out-of-the-box support is enabled. If you do not provide your own key, the backend automatically falls back to a server-side default key or uses the `GEMINI_API_KEY` defined in your environment variables. 
- Fallback keys are handled entirely on the server-side inside Python, meaning your keys are **never** exposed to the frontend/browser client source code.

---

## 📁 Repository Structure

```text
RE-V2/
├── app.py              # Flask Application (API endpoints, PDF parsing, AI dispatches)
├── requirements.txt    # Python dependencies
├── templates/
│   └── index.html      # Frontend HTML template (refactored with url_for paths)
├── static/
│   ├── app.js          # Client-side form handlers & UI rendering logic
│   └── styles.css      # Vanilla CSS rules, theme palettes, and animations
├── demo.html           # Original client-only frontend demo
└── app.js              # Original client-only frontend script (deprecated)
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have **Python 3.8+** installed.

### 1. Installation

Clone the repository and install the required Python packages:

```bash
git clone https://github.com/Sridattasai18/Resume-Engineer.git
cd Resume-Engineer
pip install -r requirements.txt
```

### 2. Configure environment (Optional)

If you want to use your own server-side Gemini key as the default, define it in your shell environment:

```bash
# On Linux/macOS
export GEMINI_API_KEY="your-gemini-api-key"

# On Windows (CMD)
set GEMINI_API_KEY=your-gemini-api-key

# On Windows (PowerShell)
$env:GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Run the application

Start the Flask server locally:

```bash
python app.py
```

The application will start on **`http://127.0.0.1:5000`**. Open it in your browser and start tailoring!

---

## 📝 Features & Usage

1. **Upload or Paste**:
   - In **LaTeX mode**, paste your base LaTeX resume code, or click **Or upload PDF resume…** to upload a PDF.
   - Or, switch to **Build from scratch** to input your details section-by-section.
2. **Add Context**: Paste the Target Job Description in the text area.
3. **Pick a Template**: Select one of our built-in ATS-friendly templates (e.g., *Jake Classic* or *Data Science*).
4. **Generate**: Click **Generate tailored resume**.
5. **Clear the ATS**:
   - Check the **ATS Report** to see your JD match score and missing keywords.
   - Inspect the **LaTeX Code** or copy it directly to Overleaf.
   - View the visual **HTML Preview** or download your custom **Cover Letter**.
