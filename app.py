import os
import json
import re
from flask import Flask, request, jsonify, render_template
import requests
import pypdf

app = Flask(__name__)

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

def call_openrouter(model, system_prompt, user_prompt, api_key):
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "http://localhost:5000"
    }
    payload = {
        "model": model,
        "max_tokens": 8000,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    }
    res = requests.post(url, headers=headers, json=payload)
    res.raise_for_status()
    data = res.json()
    if "error" in data:
        raise Exception(data["error"].get("message", "OpenRouter error"))
    return data.get("choices", [{}])[0].get("message", {}).get("content", "")

def call_claude(model, system_prompt, user_prompt, api_key):
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01"
    }
    payload = {
        "model": model,
        "max_tokens": 8000,
        "system": system_prompt,
        "messages": [
            {"role": "user", "content": user_prompt}
        ]
    }
    res = requests.post(url, headers=headers, json=payload)
    res.raise_for_status()
    data = res.json()
    if "error" in data:
        raise Exception(data["error"].get("message", "Claude API error"))
    
    content = data.get("content", [])
    text_blocks = [block["text"] for block in content if block.get("type") == "text"]
    return "".join(text_blocks)

def call_gemini(model, system_prompt, user_prompt, api_key):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}]
    }
    res = requests.post(url, headers=headers, json=payload)
    res.raise_for_status()
    data = res.json()
    if "error" in data:
        raise Exception(data["error"].get("message", "Gemini API error"))
    
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raise Exception("Failed to extract response text from Gemini API response.")

def call_openai(model, system_prompt, user_prompt, api_key):
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    payload = {
        "model": model,
        "max_tokens": 8000,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    }
    res = requests.post(url, headers=headers, json=payload)
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
            model = data.get("model", "gemini-2.0-flash")
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
            model = request.form.get("model", "gemini-2.0-flash")
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
                api_key = os.environ.get("GEMINI_API_KEY", "AIzaSyCBYhroAJmya6o5O3ywiBwdSnmj4CmQOCI")
            else:
                return jsonify({"error": "API key required. Configure your provider credentials."}), 400

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
        elif provider == "claude":
            response_text = call_claude(model, sys_prompt, usr_prompt, api_key)
        elif provider == "openai":
            response_text = call_openai(model, sys_prompt, usr_prompt, api_key)
        elif provider == "gemini":
            response_text = call_gemini(model, sys_prompt, usr_prompt, api_key)
        else:
            return jsonify({"error": f"Unsupported provider: {provider}"}), 400

        # Clean JSON markdown blocks if any returned
        response_text = response_text.strip()
        if response_text.startswith("```"):
            lines = response_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            response_text = "\n".join(lines).strip()

        # Parse JSON to validate structure
        try:
            parsed_json = json.loads(response_text)
        except json.JSONDecodeError:
            match = re.search(r"\{[\s\S]*\}", response_text)
            if match:
                parsed_json = json.loads(match.group(0))
            else:
                raise Exception("The server response could not be parsed as valid JSON.")

        return jsonify(parsed_json)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
