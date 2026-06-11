import os
import json
import re
from flask import Flask, request, jsonify, render_template
import requests
import pypdf
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

app = Flask(__name__)

# ── JSON REPAIR UTILITY ──────────────────────────────────────────────────────
def repair_json(text):
    """
    Multi-strategy JSON repair for AI responses that contain LaTeX code.
    LaTeX has many backslashes and newlines that can break JSON string values.
    """
    text = text.strip()

    # Strategy 1: Remove markdown code fences
    if text.startswith("```"):
        lines = text.splitlines()
        lines = lines[1:]  # drop opening fence
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]  # drop closing fence
        text = "\n".join(lines).strip()

    # Strategy 2: Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strategy 3: Extract outermost JSON blob
    blob_match = re.search(r"\{[\s\S]*\}", text)
    if blob_match:
        blob = blob_match.group(0)
        try:
            return json.loads(blob)
        except json.JSONDecodeError:
            pass
        # Strategy 4: Fix unescaped literal newlines inside JSON string values.
        # We scan character-by-character tracking whether we are inside a string
        # and replace raw newlines / unescaped backslashes with their JSON escapes.
        try:
            fixed = _fix_json_strings(blob)
            return json.loads(fixed)
        except Exception:
            pass

    raise ValueError("Could not parse AI response as valid JSON. The response may have been truncated or malformed.")


def _fix_json_strings(s):
    """Escape raw newlines and lone backslashes that appear inside JSON string values."""
    result = []
    in_string = False
    i = 0
    while i < len(s):
        ch = s[i]
        if in_string:
            if ch == '\\':
                # Check if the next character forms a valid JSON escape
                nxt = s[i + 1] if i + 1 < len(s) else ''
                valid_escapes = set('"\\/bfnrtu')
                if nxt in valid_escapes:
                    result.append(ch)
                    result.append(nxt)
                    i += 2
                    continue
                else:
                    # Lone backslash — double it
                    result.append('\\\\')
                    i += 1
                    continue
            elif ch == '"':
                in_string = False
                result.append(ch)
            elif ch == '\n':
                # Raw newline inside string — replace with \n
                result.append('\\n')
            elif ch == '\r':
                result.append('\\r')
            elif ch == '\t':
                result.append('\\t')
            else:
                result.append(ch)
        else:
            if ch == '"':
                in_string = True
                result.append(ch)
            else:
                result.append(ch)
        i += 1
    return ''.join(result)

def extract_text_from_pdf(stream):
    try:
        reader = pypdf.PdfReader(stream)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text
    except Exception as e:
        raise Exception(f"PDF parsing failed: {str(e)}")


# ── PROVIDER API CALLS ───────────────────────────────────────────────────────

def call_openrouter(model, system_prompt, user_prompt, api_key):
    """OpenRouter: standard OpenAI-compatible endpoint with JSON mode."""
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://resume-engineer.app"
    }
    payload = {
        "model": model,
        "max_tokens": 8000,
        "temperature": 0.3,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    }
    res = requests.post(url, headers=headers, json=payload, timeout=120)
    res.raise_for_status()
    data = res.json()
    if "error" in data:
        raise Exception(data["error"].get("message", "OpenRouter error"))
    return data.get("choices", [{}])[0].get("message", {}).get("content", "")


def call_gemini(model, system_prompt, user_prompt, api_key):
    """
    Gemini (Google AI) API.
    Protocol:
      - POST /v1beta/models/{model}:generateContent?key=...
      - system_instruction is a top-level field
      - contents is a list with role=user
      - generationConfig.responseMimeType = "application/json" forces the model
        to return valid JSON directly — eliminates unterminated-string errors.
      - Falls back to gemini-3.1-flash-lite on quota / overload errors.
    """
    def make_request(m):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {
                "maxOutputTokens": 8000,
                "temperature": 0.3,
                "responseMimeType": "application/json"  # Guaranteed valid JSON output
            }
        }
        return requests.post(url, headers=headers, json=payload, timeout=120)

    res = make_request(model)

    # Detect rate-limit / overload errors and retry on fallback model
    is_error = False
    error_msg = ""
    try:
        data = res.json()
        if "error" in data:
            is_error = True
            error_msg = data["error"].get("message", "")
    except Exception:
        if not res.ok:
            is_error = True
            error_msg = res.text

    overload_signals = ["demand", "quota", "limit", "429", "503", "overload", "resource_exhausted"]
    if is_error and any(x in error_msg.lower() or x in str(res.status_code) for x in overload_signals) and model != "gemini-3.1-flash-lite":
        res = make_request("gemini-3.1-flash-lite")

    res.raise_for_status()
    data = res.json()
    if "error" in data:
        raise Exception(data["error"].get("message", "Gemini API error"))

    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raise Exception("Failed to extract response text from Gemini API response.")


def call_openai(model, system_prompt, user_prompt, api_key):
    """
    OpenAI (GPT) API.
    Protocol:
      - POST /v1/chat/completions
      - System message is the FIRST item in the messages array
      - response_format: {type: json_object} forces valid JSON output
        (requires gpt-4o, gpt-4-turbo, or gpt-3.5-turbo-1106+)
      - Response text is in data['choices'][0]['message']['content']
    """
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    payload = {
        "model": model,
        "max_tokens": 4000,
        "temperature": 0.3,
        "response_format": {"type": "json_object"},  # Guaranteed valid JSON output
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    }
    res = requests.post(url, headers=headers, json=payload, timeout=120)
    res.raise_for_status()
    data = res.json()
    if "error" in data:
        raise Exception(data["error"].get("message", "OpenAI API error"))
    return data.get("choices", [{}])[0].get("message", {}).get("content", "")


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/generate", methods=["POST"])
def generate():
    try:
        if request.is_json:
            data = request.get_json() or {}
            provider = data.get("provider", "gemini")
            model = data.get("model", "gemini-3.5-flash")
            api_key = data.get("apiKey", "").strip()
            jd = data.get("jd", "").strip()
            resume = data.get("resume", "").strip()
            hint = data.get("hint", "")
            want_cover = bool(data.get("wantCover"))
            want_diff = bool(data.get("wantDiff"))
            is_pdf = bool(data.get("isPDF"))
            mode = data.get("mode", "latex")
        else:
            provider = request.form.get("provider", "gemini")
            model = request.form.get("model", "gemini-3.5-flash")
            api_key = request.form.get("apiKey", "").strip()
            jd = request.form.get("jd", "").strip()
            hint = request.form.get("hint", "")
            want_cover = request.form.get("wantCover") == "true"
            want_diff = request.form.get("wantDiff") == "true"
            mode = request.form.get("mode", "latex")
            
            # Check for uploaded file
            pdf_file = request.files.get("pdf_resume")
            is_pdf = False
            if pdf_file and pdf_file.filename != "":
                resume = extract_text_from_pdf(pdf_file.stream).strip()
                is_pdf = True
            else:
                resume = request.form.get("resume", "").strip()

        if not jd:
            return jsonify({"error": "Please paste a job description first."}), 400
        if not resume:
            return jsonify({"error": "Please provide a base resume (LaTeX text or PDF upload)."}), 400
            
        if not api_key:
            if provider == "gemini":
                api_key = os.environ.get("GEMINI_API_KEY")
            elif provider == "openai":
                api_key = os.environ.get("OPENAI_API_KEY")
            elif provider == "openrouter":
                api_key = os.environ.get("OPENROUTER_API_KEY")
                
            if not api_key:
                return jsonify({"error": f"API key for {provider} is not configured on the server. Please configure it in your environment or provide it in the API settings dropdown."}), 400

        if is_pdf:
            want_diff = False

        resume_type = "plain text extracted from PDF" if is_pdf else ("LaTeX" if mode == "latex" else "form data")

        # Compile System Prompt
        sys_prompt = (
            "You are an expert resume engineer and ATS specialist for early-career/fresher candidates.\n\n"
            f"TEMPLATE:\n{hint}\n\n"
            "Respond ONLY with a single valid JSON object. No markdown fences, no preamble.\n\n"
            "Schema: {\"ats\":{\"matchScore\":<1-10>,\"atsScore\":<1-100>,\"missingKeywords\":[],\"presentKeywords\":[],\"analysis\":\"<HTML ul/li/strong>\",\"skillsGaps\":\"<HTML>\"},\"latex\":\"<complete LaTeX - backslashes doubled as \\\\\\\\, newlines as \\\\n>\",\"diff\":[],\"cover\":\"<~180 word plain text or empty string>\"}\n\n"
            f"Rules: strong action verbs, quantify every bullet, integrate missing keywords naturally, keep to ONE PAGE. "
            f"wantCover={str(want_cover).lower()}. wantDiff={str(want_diff).lower()}. Set cover to empty string if false, diff to empty array if false."
        )
        if is_pdf:
            sys_prompt += " IMPORTANT: The candidate has provided their base resume in plain text. Format the final tailored resume entirely into the specified LaTeX template structure."

        usr_prompt = f"RESUME ({resume_type}):\n{resume}\n\nJOB DESCRIPTION:\n{jd}\n\nGenerate JSON."

        # Dispatch API request
        response_text = ""
        if provider == "openrouter":
            response_text = call_openrouter(model, sys_prompt, usr_prompt, api_key)
        elif provider == "openai":
            response_text = call_openai(model, sys_prompt, usr_prompt, api_key)
        elif provider == "gemini":
            response_text = call_gemini(model, sys_prompt, usr_prompt, api_key)
        else:
            return jsonify({"error": f"Unsupported provider: {provider}"}), 400

        # Parse with multi-strategy JSON repair (handles LaTeX escape issues)
        try:
            parsed_json = repair_json(response_text)
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 500

        return jsonify(parsed_json)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
