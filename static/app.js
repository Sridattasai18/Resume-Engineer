// ── STATE ──
        var provider = 'gemini', apiKey = '', isDark = false;
        var mode = 'latex', selTpl = 'jake-classic', R = {}, isGen = false, stepTmr = null;
        var ec = { edu: 0, proj: 0, exp: 0, cert: 0, ach: 0 };

        // ── PDF STATE ──
        var pdfBase64 = '', pdfFilename = '', pdfSizeKb = 0, pdfExtractedText = '';

        var PROVIDER_META = {
            gemini: { label: 'Gemini (Google)', keyLabel: 'Google AI Studio Key', placeholder: 'AIzaSy…', hint: 'Get your key at <a href="https://aistudio.google.com" target="_blank">aistudio.google.com</a>. Very generous free tier.' },
            openai: { label: 'GPT (OpenAI)', keyLabel: 'OpenAI API Key', placeholder: 'sk-proj-…', hint: 'Get your key at <a href="https://platform.openai.com" target="_blank">platform.openai.com</a>. Requires credits.' }
        };

        var TPLS = [
            { id: 'jake-classic', name: 'Jake Classic', desc: 'CS/SWE single-col, letterpaper, ATS gold standard', ats: '5/5', ab: 'ab5', def: true },
            { id: 'datta-custom', name: 'Datta Custom', desc: 'A4, multi-col skills, India placements', ats: '5/5', ab: 'ab5' },
            { id: 'tlc-datasci', name: 'TLC Data Sci', desc: 'ML / Data Science focused roles', ats: '4/5', ab: 'ab4' },
            { id: 'harshibar', name: 'Harshibar Modern', desc: 'Sans-serif, icons, stylish', ats: '4/5', ab: 'ab4' },
            { id: 'anubhav', name: 'Anubhav Detailed', desc: 'Campus placements, India-focused', ats: '3/5', ab: 'ab3' }
        ];

        var HINTS = {
            'jake-classic': "Jake Ryan ATS template. \\documentclass[letterpaper,11pt]{article}. Packages: latexsym, fullpage, titlesec, marvosym, color, verbatim, enumitem, hyperref, fancyhdr, babel. \\pdfgentounicode=1. Single column. \\titlerule section headers. Commands: \\resumeItem{text}, \\resumeSubheading{Company}{Date}{Role}{Location}, \\resumeProjectHeading{\\textbf{Project} $|$ \\emph{Stack}}{Date}. Section order: Education, Technical Skills, Projects, Experience (if any), Certifications (if any), Extracurricular. No tables, no graphics, no color — pure ATS safe.",
            'datta-custom': "\\documentclass[a4paper,11pt]{article}. \\usepackage[left=0.9cm,right=0.9cm,top=0.6cm,bottom=0.7cm]{geometry}. \\usepackage{enumitem,hyperref,titlesec,parskip,multicol}. \\pagenumbering{gobble}. Section order: Objective, Education, Technical Skills (multicols{2}), Projects, Experience, Certifications, Achievements. Header: centered {\\Large \\textbf{Name}}, contact line.",
            'tlc-datasci': "TLC Data Science. a4paper 11pt. Sections: Objective, Technical Skills table (Languages|Libraries|Tools|Databases), Projects (ML-heavy first, include accuracy metrics and dataset sizes), Education, Certifications, Activities.",
            'harshibar': "Harshibar modern: sfdefault font, fontawesome5 icons in header. Single column. Sections: Experience, Projects, Education, Skills.",
            'anubhav': "Anubhav campus a4. Bold name header. Sections: Education (CGPA table), Skills Summary, Projects, Internships, Certifications, Positions of Responsibility, Achievements."
        };

        var STEPS = ['Parsing job description', 'Extracting keywords', 'Analysing gaps', 'Tailoring bullets', 'Generating LaTeX', 'Composing cover letter', 'Running ATS simulation'];

        // ── UTILS ──
        function ex(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
        function gv(id) { var x = document.getElementById(id); return x ? x.value : ''; }
        function tv(id) { var x = document.getElementById(id); return x ? x.checked : true; }
        function scCls(n, mx) { return n >= mx * .8 ? 'hi' : n >= mx * .6 ? 'mid' : 'lo'; }

        function cpTxt(text, btnId) {
            navigator.clipboard.writeText(text || '').then(function () {
                var b = document.getElementById(btnId); if (!b) return;
                var orig = b.textContent;
                b.textContent = 'Copied ✓'; b.classList.add('ok');
                setTimeout(function () { b.textContent = orig; b.classList.remove('ok'); }, 2000);
            }).catch(function () { alert('Copy failed — please select and copy manually.'); });
        }

        // ── THEME ──
        function toggleTheme() {
            isDark = !isDark;
            document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            document.getElementById('theme-ico').textContent = isDark ? '☾' : '☀';
            try { localStorage.setItem('re-theme', isDark ? 'dark' : 'light'); } catch (e) { }
        }
        (function () {
            try {
                if (localStorage.getItem('re-theme') === 'dark') {
                    isDark = true;
                    document.documentElement.setAttribute('data-theme', 'dark');
                    document.getElementById('theme-ico').textContent = '☾';
                }
            } catch (e) { }
        })();

        // ── SETTINGS MODAL ──
        function selectProvider(p, btn) {
            provider = p;
            document.querySelectorAll('.ptab').forEach(function (t) { t.classList.remove('on'); });
            btn.classList.add('on');
            var m = PROVIDER_META[p];
            document.getElementById('key-label').textContent = m.keyLabel;
            document.getElementById('api-key-input').placeholder = m.placeholder;
            document.getElementById('key-hint').innerHTML = m.hint;
            document.getElementById('modal-warn').style.display = 'none';
            updateGptNoteVisibility();
        }

        function openModal() {
            var overlay = document.getElementById('settings-modal');
            overlay.classList.remove('hidden');
            // show cancel if key already set
            document.getElementById('modal-cancel').style.display = apiKey ? 'block' : 'none';
            // populate existing key
            document.getElementById('api-key-input').value = apiKey || '';
            // set provider tab active
            document.querySelectorAll('.ptab').forEach(function (t) {
                t.classList.toggle('on', t.dataset.p === provider);
            });
            var m = PROVIDER_META[provider];
            document.getElementById('key-label').textContent = m.keyLabel;
            document.getElementById('api-key-input').placeholder = m.placeholder;
            document.getElementById('key-hint').innerHTML = m.hint;
        }

        function closeModal() {
            document.getElementById('settings-modal').classList.add('hidden');
        }

        function saveSettings() {
            var key = document.getElementById('api-key-input').value.trim();
            if (!key) {
                document.getElementById('modal-warn').style.display = 'block';
                return;
            }
            apiKey = key;
            try {
                localStorage.setItem('re-provider', provider);
                localStorage.setItem('re-key', key);
            } catch (e) { }
            updateNavProvider();
            closeModal();
            updateGptNoteVisibility();
        }

        function updateNavProvider() {
            var labels = { gemini: 'Gemini', openai: 'GPT-4o' };
            document.getElementById('nav-provider-lbl').textContent = labels[provider] || 'Set API Key';
            document.getElementById('nav-dot').style.background = apiKey ? 'var(--accent)' : 'var(--warn)';
        }

        // Load saved settings
        (function () {
            try {
                var sp = localStorage.getItem('re-provider');
                var sk = localStorage.getItem('re-key');
                if (sp) provider = sp;
                if (sk) apiKey = sk;
                updateNavProvider();
                if (!sk) {
                    // Show modal on first visit
                    setTimeout(openModal, 400);
                }
            } catch (e) {
                setTimeout(openModal, 400);
            }
        })();

        // ── MODE ──
        function setMode(m) {
            mode = m;
            document.querySelectorAll('.nav-mid').forEach(function (nav) {
                var btnL = nav.querySelector('#mbL') || nav.querySelector('#mmL');
                var btnF = nav.querySelector('#mbF') || nav.querySelector('#mmF');
                var btnP = nav.querySelector('#mbP') || nav.querySelector('#mmP');
                if (btnL) btnL.classList.toggle('on', m === 'latex');
                if (btnF) btnF.classList.toggle('on', m === 'form');
                if (btnP) btnP.classList.toggle('on', m === 'pdf');
            });
            document.getElementById('mode-latex').style.display = m === 'latex' ? 'block' : 'none';
            document.getElementById('mode-form').style.display = m === 'form' ? 'block' : 'none';
            document.getElementById('mode-pdf').style.display = m === 'pdf' ? 'block' : 'none';
            updateGptNoteVisibility();

            var el = document.querySelector('.input-section');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
            }
        }

        // ── ACCORDION ──
        function toggleAcc(hd) {
            var body = hd.nextElementSibling;
            var ch = hd.querySelector('.acc-chev');
            var open = body.classList.contains('show');
            body.classList.toggle('show', !open);
            if (ch) ch.classList.toggle('open', !open);
        }

        // ── FAQ ──
        function toggleFaq(q) {
            var a = q.nextElementSibling;
            q.classList.toggle('open');
            a.classList.toggle('show');
        }

        // ── TEMPLATES ──
        function initTpls() {
            ['tl-latex', 'tl-form', 'tl-pdf'].forEach(function (lid) {
                var c = document.getElementById(lid); if (!c) return;
                c.innerHTML = TPLS.map(function (t) {
                    return '<div class="tpl-item' + (t.def ? ' sel' : '') + '" data-id="' + t.id + '" onclick="pickTpl(this,\'' + lid + '\')">' +
                        '<div class="tpl-radio"></div>' +
                        '<div class="tpl-meta"><div class="tpl-name">' + t.name + '</div><div class="tpl-desc">' + t.desc + '</div></div>' +
                        '<span class="tpl-badge ' + t.ab + '">ATS ' + t.ats + '</span></div>';
                }).join('');
            });
        }

        function pickTpl(el, lid) {
            document.querySelectorAll('#' + lid + ' .tpl-item').forEach(function (r) { r.classList.remove('sel'); });
            el.classList.add('sel');
            selTpl = el.dataset.id;
        }

        // ── PDF HANDLERS ──
        function initPdfDragAndDrop() {
            var dz = document.getElementById('pdf-dropzone');
            if (!dz) return;
            
            ['dragenter', 'dragover'].forEach(function (eventName) {
                dz.addEventListener(eventName, function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    dz.classList.add('hover');
                }, false);
            });

            ['dragleave', 'drop'].forEach(function (eventName) {
                dz.addEventListener(eventName, function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    dz.classList.remove('hover');
                }, false);
            });

            dz.addEventListener('drop', function(e) {
                var dt = e.dataTransfer;
                var files = dt.files;
                if (files && files.length > 0) {
                    handlePdfFile(files[0]);
                }
            }, false);
        }

        function onPdfFileSelect(e) {
            var files = e.target.files;
            if (files && files.length > 0) {
                handlePdfFile(files[0]);
            }
        }

        function handlePdfFile(file) {
            var errDiv = document.getElementById('pdf-err');
            errDiv.style.display = 'none';
            errDiv.textContent = '';

            if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                errDiv.textContent = 'Only PDF files are supported.';
                errDiv.style.display = 'block';
                return;
            }

            if (file.size > 10 * 1024 * 1024) { // 10MB
                errDiv.textContent = 'File size exceeds 10MB limit.';
                errDiv.style.display = 'block';
                return;
            }

            pdfFilename = file.name;
            pdfSizeKb = Math.round(file.size / 1024);

            var reader = new FileReader();
            reader.onload = async function(e) {
                var result = e.target.result;
                var base64Data = result.split(',')[1];
                pdfBase64 = base64Data;
                
                document.getElementById('pdf-meta-name').textContent = pdfFilename;
                document.getElementById('pdf-meta-size').textContent = pdfSizeKb + ' KB';
                document.getElementById('pdf-dropzone').style.display = 'none';
                document.getElementById('pdf-preview-box').style.display = 'flex';

                try {
                    pdfExtractedText = await extractTextFromPdfData(base64Data);
                    updateGptNoteVisibility();
                } catch(err) {
                    console.error('Error extracting PDF text:', err);
                }
            };
            reader.onerror = function() {
                errDiv.textContent = 'Error reading file.';
                errDiv.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }

        function removePdf() {
            pdfBase64 = '';
            pdfFilename = '';
            pdfSizeKb = 0;
            pdfExtractedText = '';
            
            document.getElementById('pdf-file-input').value = '';
            document.getElementById('pdf-dropzone').style.display = 'flex';
            document.getElementById('pdf-preview-box').style.display = 'none';
            document.getElementById('pdf-err').style.display = 'none';
            document.getElementById('pdf-err').textContent = '';
            updateGptNoteVisibility();
        }

        function updateGptNoteVisibility() {
            var note = document.getElementById('pdf-gpt-note');
            if (note) {
                note.style.display = (pdfBase64 && provider === 'openai') ? 'block' : 'none';
            }
        }

        async function extractTextFromPdfData(base64Data) {
            var raw = window.atob(base64Data);
            var rawLength = raw.length;
            var array = new Uint8Array(new ArrayBuffer(rawLength));
            for (var i = 0; i < rawLength; i++) {
                array[i] = raw.charCodeAt(i);
            }
            
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            var loadingTask = pdfjsLib.getDocument({ data: array });
            var pdf = await loadingTask.promise;
            var text = '';
            for (var i = 1; i <= pdf.numPages; i++) {
                var page = await pdf.getPage(i);
                var content = await page.getTextContent();
                text += content.items.map(function(item) { return item.str; }).join(' ') + '\n';
            }
            return text;
        }

        // ── ENTRY CARDS ──
        function addEntry(type) {
            var list = document.getElementById(type + '-list'); if (!list) return;
            ec[type]++; var n = ec[type];
            var uid = type + n + 'x' + Date.now();
            var card = document.createElement('div'); card.className = 'ecard'; card.id = uid;
            var rm = '<button class="ecard-rm" onclick="document.getElementById(\'' + uid + '\').remove()">✕</button>';
            var hd = '<div class="ecard-hd"><span class="ecard-lbl">' + type + ' ' + n + '</span>' + rm + '</div>';
            if (type === 'edu') {
                card.innerHTML = hd + '<div class="fg">' +
                    '<div class="ff full"><label>Institution</label><input type="text" placeholder="Vishnu Institute of Technology, Bhimavaram"></div>' +
                    '<div class="ff full"><label>Degree &amp; Branch</label><input type="text" placeholder="B.Tech in CSE (AI &amp; DS)"></div>' +
                    '<div class="ff"><label>Start</label><input type="text" placeholder="2023"></div>' +
                    '<div class="ff"><label>End / Expected</label><input type="text" placeholder="2027 (Expected)"></div>' +
                    '<div class="ff"><label>CGPA / %</label><input type="text" placeholder="8.33 / 10"></div>' +
                    '<div class="ff"><label>Location</label><input type="text" placeholder="Bhimavaram, AP"></div>' +
                    '<div class="ff full"><label>Relevant Coursework</label><input type="text" placeholder="DSA, DBMS, OS, ML, CN"></div></div>';
            } else if (type === 'proj') {
                card.innerHTML = hd + '<div class="fg">' +
                    '<div class="ff"><label>Project Name</label><input type="text" placeholder="AgriVision"></div>' +
                    '<div class="ff"><label>Tech Stack</label><input type="text" placeholder="Python, Flask, React"></div>' +
                    '<div class="ff"><label>Duration</label><input type="text" placeholder="Jan 2024 – Mar 2024"></div>' +
                    '<div class="ff"><label>GitHub / Demo</label><input type="text" placeholder="github.com/you/project"></div>' +
                    '<div class="ff full"><label>Description</label><input type="text" placeholder="One-line description"></div>' +
                    '<div class="ff full"><label>Key Bullets (one per line, use numbers)</label>' +
                    '<textarea rows="4" placeholder="Trained model achieving 91% accuracy on 12k samples\nBuilt REST API serving 300+ daily requests\nDeployed on Render with 99.7% uptime"></textarea></div></div>';
            } else if (type === 'exp') {
                card.innerHTML = hd + '<div class="fg">' +
                    '<div class="ff"><label>Company</label><input type="text" placeholder="SmartBridge"></div>' +
                    '<div class="ff"><label>Role</label><input type="text" placeholder="Data Science Intern"></div>' +
                    '<div class="ff"><label>Duration</label><input type="text" placeholder="May 2025 – Jul 2025"></div>' +
                    '<div class="ff"><label>Mode</label><input type="text" placeholder="Remote"></div>' +
                    '<div class="ff full"><label>Key Bullets (quantify impact)</label>' +
                    '<textarea rows="4" placeholder="Analysed 50k-row dataset; surfaced 3 revenue trends\nBuilt Tableau dashboard adopted by 4 teams\nAutomated pipeline saving 6 hours/week"></textarea></div></div>';
            } else if (type === 'cert') {
                card.innerHTML = hd + '<div class="fg">' +
                    '<div class="ff full"><label>Certification &amp; Issuer</label><input type="text" placeholder="Programming in Java — NPTEL (IIT Kharagpur)"></div>' +
                    '<div class="ff"><label>Platform</label><input type="text" placeholder="NPTEL / Coursera / Kaggle"></div>' +
                    '<div class="ff"><label>Year</label><input type="text" placeholder="2024"></div></div>';
            } else if (type === 'ach') {
                card.innerHTML = hd + '<div class="fg">' +
                    '<div class="ff full"><label>Achievement / Activity</label><input type="text" placeholder="Finalist — Smart India Hackathon 2024, VIT"></div>' +
                    '<div class="ff full"><label>Details (optional)</label><input type="text" placeholder="Top 3 of 40 teams; built AgriVision"></div></div>';
            }
            list.appendChild(card);
        }

        // ── FORM BUILDER ──
        function buildForm() {
            var t = 'NAME: ' + gv('f-name') + '\nPHONE: ' + gv('f-phone') + ' | EMAIL: ' + gv('f-email') + ' | LOCATION: ' + gv('f-loc') + '\nLINKEDIN: ' + gv('f-linkedin') + ' | GITHUB: ' + gv('f-github');
            var p = gv('f-portfolio'); if (p) t += ' | PORTFOLIO: ' + p;
            t += '\n\nOBJECTIVE:\n' + gv('f-obj') + '\n\n';
            document.querySelectorAll('#edu-list .ecard').forEach(function (x) {
                var i = x.querySelectorAll('input');
                t += 'EDU: ' + i[0].value + ' | ' + i[1].value + ' | ' + i[2].value + ' – ' + i[3].value + ' | CGPA: ' + i[4].value + ' | ' + i[5].value + '\nCoursework: ' + i[6].value + '\n\n';
            });
            t += 'SKILLS:\nLanguages: ' + gv('f-langs') + '\nFrameworks: ' + gv('f-fw') + '\nDatabases: ' + gv('f-db') + '\nTools: ' + gv('f-tools') + '\nML/Data: ' + gv('f-ml') + '\nCloud: ' + gv('f-cloud') + '\n\n';
            document.querySelectorAll('#proj-list .ecard').forEach(function (x) {
                var i = x.querySelectorAll('input'), ta = x.querySelector('textarea');
                t += 'PROJECT: ' + i[0].value + ' | Stack: ' + i[1].value + ' | ' + i[2].value + ' | ' + i[3].value + '\nDesc: ' + i[4].value + '\n' + (ta ? ta.value : '') + '\n\n';
            });
            document.querySelectorAll('#exp-list .ecard').forEach(function (x) {
                var i = x.querySelectorAll('input'), ta = x.querySelector('textarea');
                t += 'EXPERIENCE: ' + i[0].value + ' | ' + i[1].value + ' | ' + i[2].value + ' | ' + i[3].value + '\n' + (ta ? ta.value : '') + '\n\n';
            });
            document.querySelectorAll('#cert-list .ecard').forEach(function (x) {
                var i = x.querySelectorAll('input');
                t += 'CERT: ' + i[0].value + ' | ' + i[1].value + ' | ' + i[2].value + '\n';
            }); t += '\n';
            document.querySelectorAll('#ach-list .ecard').forEach(function (x) {
                var i = x.querySelectorAll('input');
                t += 'ACHIEVEMENT: ' + i[0].value + ' — ' + i[1].value + '\n';
            });
            return t;
        }

        // ── API CALLS ──

        // Repair malformed JSON from AI (handles unescaped newlines in LaTeX strings)
        function repairJson(text) {
            text = (text || '').trim();
            // Strip markdown fences
            if (text.startsWith('```')) {
                var lines = text.split('\n');
                lines.shift(); // drop opening fence
                if (lines.length && lines[lines.length - 1].trim().startsWith('```')) lines.pop();
                text = lines.join('\n').trim();
            }
            // Strategy 1: direct parse
            try { return JSON.parse(text); } catch (_) {}
            // Strategy 2: extract first JSON blob
            var m = text.match(/\{[\s\S]*\}/);
            if (m) {
                try { return JSON.parse(m[0]); } catch (_) {}
                // Strategy 3: fix unescaped newlines/backslashes inside string values
                try { return JSON.parse(_fixJsonStrings(m[0])); } catch (_) {}
            }
            throw new Error('Could not parse AI response as JSON. The response may be truncated or malformed — please try again.');
        }

        function _fixJsonStrings(s) {
            var result = [], inStr = false, i = 0;
            var validEsc = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u']);
            while (i < s.length) {
                var ch = s[i];
                if (inStr) {
                    if (ch === '\\') {
                        var nxt = s[i + 1] || '';
                        if (validEsc.has(nxt)) { result.push(ch, nxt); i += 2; }
                        else { result.push('\\\\'); i++; } // double lone backslash
                    } else if (ch === '"') { inStr = false; result.push(ch); i++; }
                    else if (ch === '\n') { result.push('\\n'); i++; }
                    else if (ch === '\r') { result.push('\\r'); i++; }
                    else if (ch === '\t') { result.push('\\t'); i++; }
                    else { result.push(ch); i++; }
                } else {
                    if (ch === '"') { inStr = true; result.push(ch); i++; }
                    else { result.push(ch); i++; }
                }
            }
            return result.join('');
        }

        async function callGemini(sys, usr, isPdf) {
            var parts;
            if (isPdf) {
                parts = [
                    { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
                    { text: usr }
                ];
            } else {
                parts = [{ text: usr }];
            }

            async function fetchModel(modelName) {
                // Gemini: system_instruction top-level, responseMimeType forces valid JSON
                var resp = await fetch(
                    'https://generativelanguage.googleapis.com/v1beta/models/' + modelName + ':generateContent?key=' + apiKey,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            system_instruction: { parts: [{ text: sys }] },
                            contents: [{ role: 'user', parts: parts }],
                            generationConfig: {
                                maxOutputTokens: 8000,
                                temperature: 0.3,
                                responseMimeType: 'application/json'  // Guaranteed JSON
                            }
                        })
                    }
                );
                var data = await resp.json();
                if (data.error) throw new Error(data.error.message || 'Gemini API error');
                return data.candidates[0].content.parts[0].text;
            }

            try {
                return await fetchModel('gemini-3.5-flash');
            } catch (err) {
                var msg = err.message.toLowerCase();
                if (msg.includes('demand') || msg.includes('limit') || msg.includes('quota') ||
                    msg.includes('429') || msg.includes('503') || msg.includes('overload')) {
                    console.warn('Gemini 3.5 Flash busy, falling back to gemini-3.1-flash-lite...', err);
                    return await fetchModel('gemini-3.1-flash-lite');
                }
                throw err;
            }
        }

        async function callOpenAI(sys, usr) {
            // OpenAI: system message first; response_format forces valid JSON output
            var resp = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    max_tokens: 4000,
                    temperature: 0.3,
                    response_format: { type: 'json_object' },  // Guaranteed JSON
                    messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }]
                })
            });
            var data = await resp.json();
            if (data.error) throw new Error(data.error.message || 'OpenAI API error');
            return data.choices[0].message.content;
        }


        async function callAI(sys, usr) {
            var isPdf = (mode === 'pdf' && pdfBase64);

            // ── PATH A: Backend proxy (served from Flask) ──────────────────────────────
            // Returns a pre-parsed object directly — no double JSON round-trip.
            if (window.location.protocol.startsWith('http')) {
                try {
                    var jd = mode === 'latex' ? gv('jd-latex') : (mode === 'pdf' ? gv('jd-pdf') : gv('jd-form'));
                    var resume = '';
                    if (mode === 'latex') resume = gv('latex-input');
                    else if (mode === 'pdf') resume = pdfExtractedText;
                    else resume = buildForm();

                    var payload = {
                        provider: provider,
                        model: provider === 'gemini' ? 'gemini-3.5-flash' : 'gpt-4o',
                        apiKey: apiKey,
                        jd: jd,
                        resume: resume,
                        hint: HINTS[selTpl] || HINTS['jake-classic'],
                        wantCover: tv(mode === 'latex' ? 'tc-l' : (mode === 'pdf' ? 'tc-p' : 'tc-f')),
                        wantDiff: mode === 'latex' && tv('td-l'),
                        isPDF: isPdf,
                        mode: mode
                    };

                    var res = await fetch('/api/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (res.ok) {
                        // Backend already parsed and validated JSON — return object directly
                        return { _parsed: true, data: await res.json() };
                    } else {
                        var errData = {};
                        try { errData = await res.json(); } catch (_) {}
                        var errMsg = errData.error || 'Backend error ' + res.status;
                        console.warn('Backend proxy failed:', errMsg);
                        if (errMsg.includes('API key') || errMsg.includes('api_key')) throw new Error(errMsg);
                    }
                } catch (e) {
                    if (e.message && (e.message.includes('API key') || e.message.includes('api_key'))) throw e;
                    console.warn('Backend proxy error, falling back to direct fetch:', e);
                }
            }

            // ── PATH B: Direct client-side fetch (fallback) ───────────────────────────
            // Returns raw text; generate() will call repairJson() on it.
            if (provider === 'gemini') return callGemini(sys, usr, isPdf);
            if (provider === 'openai') return callOpenAI(sys, usr);
            throw new Error('No provider selected');
        }

        // ── GENERATE ──
        async function generate() {
            if (isGen) return;
            if (!apiKey && provider !== 'gemini') { openModal(); return; }
            
            var isL = mode === 'latex';
            var isP = mode === 'pdf';
            var jd;
            if (isL) jd = gv('jd-latex');
            else if (isP) jd = gv('jd-pdf');
            else jd = gv('jd-form');
            jd = (jd || '').trim();

            var resume = '';
            if (isL) resume = gv('latex-input');
            else if (isP) {
                if (provider === 'openai') {
                    resume = pdfExtractedText;
                } else {
                    resume = "PDF Document uploaded.";
                }
            } else resume = buildForm();
            resume = (resume || '').trim();

            if (!jd) { alert('Please paste a job description first.'); return; }
            if (isP && !pdfBase64) { alert('Please upload your PDF resume first.'); return; }
            if (!isP && !resume) { alert(isL ? 'Please paste your LaTeX resume.' : 'Please fill in at least your basic details.'); return; }

            isGen = true; R = {};
            document.getElementById('run-btn').disabled = true;
            document.getElementById('run-ico').innerHTML = '<span class="spin"></span>';
            document.getElementById('run-lbl').textContent = 'Generating…';
            var pr = document.getElementById('prog'); pr.style.width = '0%'; pr.classList.add('live');
            document.getElementById('err-banner').style.display = 'none';

            var ob = document.getElementById('out-body');
            ob.innerHTML = '<div class="loading-state"><div class="ls-pre">— AI is working</div><ul class="ls-steps">' +
                STEPS.map(function (s, i) { return '<li class="ls-step" id="st' + i + '"><span class="ls-step-n">0' + (i + 1) + '</span><span class="ls-step-t">' + s + '</span></li>'; }).join('') + '</ul></div>';
            document.getElementById('results-section').style.display = 'block';
            window.scrollTo({ top: document.getElementById('results-section').offsetTop - 80, behavior: 'smooth' });

            var si = 0; if (stepTmr) clearInterval(stepTmr);
            stepTmr = setInterval(function () {
                if (si > 0) { var p = document.getElementById('st' + (si - 1)); if (p) { p.classList.remove('on'); p.classList.add('done'); } }
                var c = document.getElementById('st' + si); if (c) c.classList.add('on');
                si++; if (si >= STEPS.length) clearInterval(stepTmr);
            }, 2400);

            var wC = tv(isL ? 'tc-l' : (isP ? 'tc-p' : 'tc-f'));
            var wD = isL && tv('td-l');
            
            var activeLid = isL ? 'tl-latex' : (isP ? 'tl-pdf' : 'tl-form');
            var activeTplEl = document.querySelector('#' + activeLid + ' .tpl-item.sel');
            if (activeTplEl) {
                selTpl = activeTplEl.dataset.id;
            }
            var hint = HINTS[selTpl] || HINTS['jake-classic'];

            var pdfInstruction = isP ? "Extract all information from the attached PDF resume (name, contact, education, skills, projects, experience, certifications, achievements), then generate a brand new LaTeX resume using the selected template, tailored to the job description. Do not carry over any LaTeX formatting from the PDF — rebuild entirely in the chosen template style.\n\n" : "";

            var sys = pdfInstruction + "You are an expert resume engineer and ATS specialist for early-career/fresher candidates.\n\nTEMPLATE:\n" + hint + "\n\nRespond ONLY with a single valid JSON object. No markdown fences, no preamble, no trailing text.\n\nJSON schema:\n{\"ats\":{\"matchScore\":<1-10>,\"atsScore\":<1-100>,\"missingKeywords\":[\"...\"],\"presentKeywords\":[\"...\"],\"analysis\":\"<HTML using ul/li/strong>\",\"skillsGaps\":\"<HTML>\"},\"latex\":\"<COMPLETE compilable LaTeX — escape backslashes as \\\\\\\\ and newlines as \\\\n>\",\"diff\":[\"+ added line\",\"- removed line\",\"  context\"],\"cover\":\"<~180 word plain text or empty string>\"}\n\nRules:\n- Strong action verbs (Developed, Engineered, Optimised, Deployed, Architected)\n- Quantify every bullet with numbers, percentages, or scale\n- Integrate missing keywords naturally\n- One page max\n- wantCover=" + wC + " (set cover to empty string if false)\n- wantDiff=" + wD + " (set diff to empty array if false)";

            var usr = "";
            if (isP) {
                if (provider === 'openai') {
                    usr = "EXTRACTED RESUME TEXT:\n" + pdfExtractedText + "\n\nJOB DESCRIPTION:\n" + jd + "\n\nGenerate JSON now.";
                } else {
                    usr = "Please tailor the attached PDF resume to the following JOB DESCRIPTION:\n" + jd + "\n\nGenerate JSON now.";
                }
            } else {
                usr = "RESUME (" + (isL ? "LaTeX source" : "structured form data") + "):\n" + resume + "\n\nJOB DESCRIPTION:\n" + jd + "\n\nGenerate JSON now.";
            }

            try {
                setTimeout(function () { pr.style.width = '30%'; }, 300);
                var aiResult = await callAI(sys, usr);
                pr.style.width = '90%';

                // PATH A: backend returned pre-parsed object
                if (aiResult && typeof aiResult === 'object' && aiResult._parsed) {
                    R = aiResult.data;
                // PATH B: direct client call returned raw text string
                } else {
                    R = repairJson(aiResult);
                }

                pr.style.width = '100%';
                setTimeout(function () { pr.style.width = '0%'; pr.classList.remove('live'); }, 500);
            } catch (err) {
                R = {};
                pr.style.width = '0%'; pr.classList.remove('live');
                var eb = document.getElementById('err-banner');
                eb.innerHTML = '<strong>Error:</strong> ' + ex(err.message);
                eb.style.display = 'block';
            }

            if (stepTmr) clearInterval(stepTmr);
            isGen = false;
            document.getElementById('run-btn').disabled = false;
            document.getElementById('run-ico').textContent = '⚡';
            document.getElementById('run-lbl').textContent = 'Generate';

            if (R.ats) renderResults();
        }

        // ── RENDER RESULTS ──
        function renderResults() {
            var d = R.ats || {};
            var ms = d.matchScore || 0, as = d.atsScore || 0;
            var isL = mode === 'latex';

            // Jump bar
            var jumps = ['<span class="jump-pre">Jump to:</span>',
                jumpLink('r-ats', 'ATS Report'),
                jumpLink('r-latex', 'LaTeX Code')
            ];
            if (isL && (R.diff || []).length) jumps.push(jumpLink('r-diff', 'Diff'));
            if (R.cover) jumps.push(jumpLink('r-cover', 'Cover Letter'));
            jumps.push(jumpLink('r-pdf', 'PDF Preview'));
            jumps.push(jumpLink('r-check', 'Checklist'));

            var html = '<div class="jump-bar">' + jumps.join('') + '</div>';

            // ATS Report
            html += '<div class="rcard" id="r-ats"><div class="rcard-lbl">ATS Report</div>' +
                '<div class="score-grid">' +
                '<div class="sc ' + scCls(ms, 10) + '"><div class="sc-n">' + ms + '<span style="font-size:20px;opacity:.5">/10</span></div><div class="sc-l">JD Match</div><div class="sc-bar"><div class="sc-fill" style="width:' + (ms / 10 * 100) + '%"></div></div></div>' +
                '<div class="sc ' + scCls(as, 100) + '"><div class="sc-n">' + as + '<span style="font-size:20px;opacity:.5">/100</span></div><div class="sc-l">ATS Score</div><div class="sc-bar"><div class="sc-fill" style="width:' + as + '%"></div></div></div>' +
                '</div>' +
                '<div class="chip-section"><div class="chip-section-lbl">Missing keywords — add these to your resume</div><div class="chips">' +
                ((d.missingKeywords || []).map(function (k) { return '<span class="chip chip-miss">' + ex(k) + '</span>'; }).join('') || '<span class="chip chip-neu">None — great match</span>') +
                '</div></div>' +
                '<div class="chip-section"><div class="chip-section-lbl">Present keywords — already matching</div><div class="chips">' +
                ((d.presentKeywords || []).map(function (k) { return '<span class="chip chip-hit">' + ex(k) + '</span>'; }).join('') || '<span class="chip chip-neu">—</span>') +
                '</div></div>' +
                '<div style="margin-top:12px"><div style="font-size:12px;font-weight:500;color:var(--ink);margin-bottom:6px">Analysis</div><div class="atext">' + (d.analysis || '—') + '</div></div>' +
                '<div style="margin-top:12px"><div style="font-size:12px;font-weight:500;color:var(--ink);margin-bottom:6px">Skills Gaps</div><div class="atext">' + (d.skillsGaps || 'No major gaps identified.') + '</div></div>' +
                '</div>';

            // LaTeX
            html += '<div class="rcard" id="r-latex"><div class="rcard-lbl">LaTeX Code</div>' +
                '<div class="code-meta">Template: <span>' + ex(selTpl) + '</span> &nbsp;·&nbsp; Copy → Overleaf → Compile → Export PDF</div>' +
                '<div class="code-box">' + ex(R.latex || '') + '</div>' +
                '<button class="cpbtn" id="cpbtn-latex" onclick="cpTxt(R.latex,\'cpbtn-latex\')">Copy full LaTeX code</button>' +
                '</div>';

            // Diff (LaTeX mode only)
            if (isL && (R.diff || []).length) {
                html += '<div class="rcard" id="r-diff"><div class="rcard-lbl">Diff — Changes vs Base</div>' +
                    '<div class="diff-box">' +
                    (R.diff || []).map(function (l) {
                        if (l[0] === '+') return '<div class="dl dla">' + ex(l) + '</div>';
                        if (l[0] === '-') return '<div class="dl dlr">' + ex(l) + '</div>';
                        return '<div class="dl dlc">' + ex(l) + '</div>';
                    }).join('') +
                    '</div></div>';
            }

            // Cover Letter
            if (R.cover) {
                html += '<div class="rcard" id="r-cover"><div class="rcard-lbl">Cover Letter</div>' +
                    '<p class="atext" style="margin-bottom:10px">Personalise the salutation with the hiring manager\'s name if you know it.</p>' +
                    '<div class="cover-box">' + ex(R.cover) + '</div>' +
                    '<button class="cpbtn" id="cpbtn-cover" onclick="cpTxt(R.cover,\'cpbtn-cover\')">Copy cover letter</button>' +
                    '</div>';
            }

            // PDF Preview
            html += '<div class="rcard" id="r-pdf"><div class="rcard-lbl">PDF Preview</div>' +
                '<div class="pdf-actions-bar">' +
                '<span class="pdf-action-lbl">Approximate HTML preview</span>' +
                '<div class="pdf-btns">' +
                '<button class="pdf-btn" id="cpbtn-pdf" onclick="cpTxt(R.latex,\'cpbtn-pdf\')">Copy LaTeX</button>' +
                '<button class="pdf-btn" onclick="window.open(\'https://www.overleaf.com\',\'_blank\')">Open Overleaf ↗</button>' +
                '</div></div>' +
                parsePDF(R.latex || '') +
                '<p class="pdf-hint">Approximate preview only — compile on <a href="https://www.overleaf.com" target="_blank" style="color:var(--accent-txt)">Overleaf</a> for exact output.</p>' +
                '</div>';

            // Checklist
            var items = [
                { t: 'Match score 8/10 or above (yours: ' + ms + '/10)', p: ms >= 8 },
                { t: 'ATS score 90/100 or above (yours: ' + as + ')', p: as >= 90 },
                { t: 'LaTeX code generated', p: !!R.latex },
                { t: 'Fewer than 3 missing keywords', p: (d.missingKeywords || []).length < 3 },
                { t: 'No tables or graphics (ATS safe)', p: true },
                { t: 'Cover letter ready', p: !!R.cover }
            ];
            var allPass = items.every(function (i) { return i.p; });
            html += '<div class="rcard" id="r-check"><div class="rcard-lbl">Pre-Apply Checklist</div>' +
                '<div class="chk-list">' + items.map(function (i) {
                    return '<div class="ci ' + (i.p ? 'pass' : 'fail') + '"><span class="ci-ico">' + (i.p ? 'pass' : 'fail') + '</span><span class="ci-txt">' + i.t + '</span></div>';
                }).join('') + '</div>' +
                '<div class="verdict ' + (allPass ? 'ok' : 'wait') + '">' +
                (allPass ? 'Ready to apply. Copy the LaTeX, compile on Overleaf, export PDF, and submit.' :
                    'Not quite ready — review the ATS Report and integrate the missing keywords first.') +
                '</div></div>';

            document.getElementById('out-body').innerHTML = html;
        }

        function jumpLink(id, label) {
            return '<span class="jump-link" onclick="document.getElementById(\'' + id + '\').scrollIntoView({behavior:\'smooth\'})">' + label + '</span>';
        }

        // ── PDF PARSER ──
        function parsePDF(latex) {
            if (!latex) return '<div style="padding:32px;text-align:center;color:var(--muted);font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;border:1px dashed var(--hairline);border-radius:3px">No LaTeX generated yet</div>';
            try {
                var nM = latex.match(/\\Large[^}]*\\textbf\{([^}]+)\}/) || latex.match(/\\textbf\{([A-Z][^}]{2,40})\}/);
                var name = nM ? nM[1] : 'Your Name';
                var eM = latex.match(/href\{mailto:[^}]+\}\{([^}]+)\}/);
                var email = eM ? eM[1] : '';
                var secs = []; var sr = /\\section\*?\{([^}]+)\}([\s\S]*?)(?=\\section|\\end\{document\})/g; var sm;
                while ((sm = sr.exec(latex)) !== null) secs.push({ t: sm[1].replace(/\\[a-z]+/g, '').trim(), b: sm[2] });
                var h = '<div class="pdf-page"><div class="pdf-name">' + ex(name) + '</div><div class="pdf-contact">' + ex(email) + (email ? ' | ' : '') + ' LinkedIn | GitHub</div>';
                secs.forEach(function (sec) {
                    h += '<div class="pdf-sec">' + ex(sec.t) + '</div>';
                    var subs = []; var subR = /\\resumeSubheading\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}\{([^}]*)\}/g; var sbm;
                    while ((sbm = subR.exec(sec.b)) !== null) subs.push({ o: sbm[1], d: sbm[2], r: sbm[3], l: sbm[4] });
                    var bullets = []; var bR = /\\resumeItem\{([^}]+)\}|\\item\s+([^\n\\]{4,})/g; var bm;
                    while ((bm = bR.exec(sec.b)) !== null) { var bt = (bm[1] || bm[2] || '').replace(/\{[^}]*\}/g, '').trim(); if (bt.length > 3) bullets.push(bt); }
                    if (subs.length) {
                        subs.forEach(function (s, si) {
                            h += '<div class="pdf-entry"><div class="pdf-hd"><span>' + ex(s.o) + '</span><span>' + ex(s.d) + '</span></div><div class="pdf-sub"><span>' + ex(s.r) + '</span><span>' + ex(s.l) + '</span></div>';
                            var eb = bullets.slice(si * 3, si * 3 + 3);
                            if (eb.length) h += '<ul class="pdf-ul">' + eb.map(function (x) { return '<li>' + ex(x.slice(0, 120)) + '</li>'; }).join('') + '</ul>';
                            h += '</div>';
                        });
                    } else if (bullets.length) {
                        h += '<ul class="pdf-ul">' + bullets.slice(0, 8).map(function (x) { return '<li>' + ex(x.slice(0, 120)) + '</li>'; }).join('') + '</ul>';
                    } else {
                        var raw = sec.b.replace(/\\[a-zA-Z]+(\[[^\]]*\])?\{?/g, '').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
                        if (raw) h += '<p style="font-size:8.5px;color:#555;margin:0">' + ex(raw) + '</p>';
                    }
                });
                if (!secs.length) h += '<p style="font-size:9px;text-align:center;color:#888;padding:20px">Open in Overleaf for accurate rendering.</p>';
                return h + '</div>';
            } catch (e) {
                return '<div style="padding:24px;text-align:center;color:var(--muted);font-size:12px">LaTeX generated — open in Overleaf for accurate rendering.</div>';
            }
        }

        // ── INIT ──
        initTpls();
        ['edu', 'proj', 'cert', 'ach'].forEach(function (t) { addEntry(t); });
        initPdfDragAndDrop();