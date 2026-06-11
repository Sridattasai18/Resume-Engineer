        /* ════════════════════════════════════════
           PROVIDERS
        ════════════════════════════════════════ */
        var PROVIDERS = {
            openrouter: {
                label: 'OpenRouter',
                models: [
                    { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
                    { id: 'google/gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash' },
                    { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick' },
                    { id: 'mistralai/mistral-medium-3', name: 'Mistral Medium 3' },
                    { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek Chat v3' }
                ],
                call: async function (model, system, user, apiKey) {
                    var res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey, 'HTTP-Referer': window.location.href },
                        body: JSON.stringify({ model: model, max_tokens: 8000, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] })
                    });
                    var d = await res.json();
                    if (d.error) throw new Error(d.error.message || 'OpenRouter error');
                    return d.choices?.[0]?.message?.content || '';
                }
            },
            claude: {
                label: 'Claude',
                models: [
                    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
                    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
                    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' }
                ],
                call: async function (model, system, user, apiKey) {
                    var res = await fetch('https://api.anthropic.com/v1/messages', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
                        body: JSON.stringify({ model: model, max_tokens: 8000, system: system, messages: [{ role: 'user', content: user }] })
                    });
                    var d = await res.json();
                    if (d.error) throw new Error(d.error.message || 'Claude API error');
                    let text = (d.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('');
                    if (!text) throw new Error('Empty response from Claude');
                    return text;
                }
            },
            gemini: {
                label: 'Gemini',
                models: [
                    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
                    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' }
                ],
                call: async function (model, system, user, apiKey) {
                    var res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            system_instruction: { parts: [{ text: system }] },
                            contents: [{ role: 'user', parts: [{ text: user }] }]
                        })
                    });
                    var d = await res.json();
                    if (d.error) throw new Error(d.error.message || 'Gemini API error');
                    let text = d.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (!text) throw new Error('Empty response from Gemini');
                    return text;
                }
            },
            openai: {
                label: 'OpenAI',
                models: [
                    { id: 'gpt-4o', name: 'GPT-4o' },
                    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
                    { id: 'o4-mini', name: 'o4-mini' }
                ],
                call: async function (model, system, user, apiKey) {
                    var res = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                        body: JSON.stringify({ model: model, max_tokens: 8000, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] })
                    });
                    var d = await res.json();
                    if (d.error) throw new Error(d.error.message || 'OpenAI API error');
                    let content = d.choices?.[0]?.message?.content;
                    if (!content) throw new Error('Empty response from OpenAI');
                    return content;
                }
            }
        };

        var selProvider = 'openrouter';
        var selModel = 'google/gemini-2.0-flash-001';

        function selectKeyProvider(p) {
            selProvider = p;
            selModel = PROVIDERS[p].models[0].id;
            document.querySelectorAll('.kdrop-opt').forEach(function (el) {
                el.classList.toggle('active', el.getAttribute('data-provider') === p);
            });
            updateBadge();
            loadKey();
        }
        function updateBadge() {
            var p = PROVIDERS[selProvider];
            var m = p.models.find(function (x) { return x.id === selModel; });
            var label = p.label + ' · ' + (m ? m.name : selModel.split('/').pop());
            var btn = document.getElementById('keys-btn');
            if (btn) btn.textContent = '⚿ ' + label;
        }
        function saveKey() {
            var k = document.getElementById('api-key-input').value.trim();
            if (k) { try { localStorage.setItem('re-apikey-' + selProvider, k); } catch (e) { } }
            var btn = document.querySelector('.kdrop-key-btn');
            if (btn) {
                var orig = btn.textContent;
                btn.textContent = 'Saved ✓';
                btn.style.background = 'var(--accent)';
                btn.style.color = 'var(--paper)';
                setTimeout(function () {
                    btn.textContent = orig;
                    btn.style.background = '';
                    btn.style.color = '';
                }, 1500);
            }
        }

        // PDF.js Upload and Parsing Logic
        var uploadedPDFText = '';

        function clearPDF() {
            uploadedPDFText = '';
            var status = document.getElementById('pdf-upload-status');
            if (status) {
                status.style.display = 'none';
                status.textContent = '';
            }
            var fileInput = document.getElementById('pdf-upload-input');
            if (fileInput) fileInput.value = '';
            var txtArea = document.getElementById('latex-input');
            if (txtArea) txtArea.placeholder = 'Paste your full LaTeX resume code here…';
        }

        async function handlePDFUpload(input) {
            var file = input.files[0];
            if (!file) return;

            var status = document.getElementById('pdf-upload-status');
            if (status) {
                status.style.display = 'block';
                status.style.color = 'var(--muted)';
                status.textContent = '⏳ Parsing PDF resume…';
            }

            try {
                var text = await extractTextFromPDF(file);
                uploadedPDFText = text;
                if (status) {
                    status.style.color = 'var(--accent-txt)';
                    status.textContent = '📄 ' + file.name + ' parsed successfully (' + text.length + ' chars). Using PDF text.';
                }
                var txtArea = document.getElementById('latex-input');
                if (txtArea) {
                    txtArea.value = '';
                    txtArea.placeholder = 'Using content from uploaded PDF: ' + file.name;
                }
            } catch (err) {
                uploadedPDFText = '';
                if (status) {
                    status.style.color = 'var(--warn-txt)';
                    status.textContent = '❌ Failed to parse PDF: ' + err.message;
                }
                var txtArea = document.getElementById('latex-input');
                if (txtArea) txtArea.placeholder = 'Paste your full LaTeX resume code here…';
            }
        }

        async function extractTextFromPDF(file) {
            var reader = new FileReader();
            return new Promise(function (resolve, reject) {
                reader.onload = async function () {
                    try {
                        var arrayBuffer = this.result;
                        var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                        var fullText = '';
                        for (var i = 1; i <= pdf.numPages; i++) {
                            var page = await pdf.getPage(i);
                            var textContent = await page.getTextContent();
                            var pageText = textContent.items.map(function (item) {
                                return item.str;
                            }).join(' ');
                            fullText += pageText + '\n';
                        }
                        resolve(fullText);
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.onerror = function () {
                    reject(new Error('Failed to read file'));
                };
                reader.readAsArrayBuffer(file);
            });
        }
        function loadKey() {
            try {
                var k = localStorage.getItem('re-apikey-' + selProvider) || '';
                document.getElementById('api-key-input').value = k;
            } catch (e) { }
        }
        async function callAI(system, user) {
            var apiKey = document.getElementById('api-key-input').value.trim();
            if (!apiKey) { try { apiKey = localStorage.getItem('re-apikey-' + selProvider) || ''; } catch (e) { } }
            if (!apiKey) throw new Error('API key required. Click the Keys button in the nav and paste your key.');
            return PROVIDERS[selProvider].call(selModel, system, user, apiKey);
        }

        /* ════════════════════════════════════════
           TEMPLATES
        ════════════════════════════════════════ */
        var TPLS = [
            { id: 'jake-classic', name: 'Jake Classic', desc: 'CS/SWE single-col, letterpaper, ATS gold standard', ats: '5/5', ab: 'ab5', def: true },
            { id: 'datta-custom', name: 'Datta Custom', desc: 'A4, multi-col skills, India placements', ats: '5/5', ab: 'ab5' },
            { id: 'tlc-datasci', name: 'Data Science', desc: 'ML / Data Science focused roles', ats: '4/5', ab: 'ab4' },
            { id: 'harshibar', name: 'Harshibar Modern', desc: 'Sans-serif, icons, stylish', ats: '4/5', ab: 'ab4' },
            { id: 'anubhav', name: 'Anubhav Detailed', desc: 'Campus placements, India-focused', ats: '3/5', ab: 'ab3' }
        ];
        var HINTS = {
            'jake-classic': "Jake Ryan ATS template. \\documentclass[letterpaper,11pt]{article}. Packages: latexsym, fullpage, titlesec, marvosym, color, verbatim, enumitem, hyperref, fancyhdr, babel. \\pdfgentounicode=1. Single column. \\titlerule section headers. Commands: \\resumeItem{text}, \\resumeSubheading{Company}{Date}{Role}{Location}, \\resumeProjectHeading{\\textbf{Project} $|$ \\emph{Stack}}{Date}. Section order: Education, Technical Skills, Projects, Experience (if any), Certifications (if any), Extracurricular/Achievements (if any). No tables, no graphics, no color.",
            'datta-custom': "\\documentclass[a4paper,11pt]{article}. \\usepackage[left=0.9cm,right=0.9cm,top=0.6cm,bottom=0.7cm]{geometry}. \\usepackage{enumitem,hyperref,titlesec,parskip,multicol}. \\pagenumbering{gobble}. Section order: Objective, Education, Technical Skills (multicols{2}), Projects, Experience, Certifications, Achievements. Header: centered {\\Large \\textbf{Name}}, contact line.",
            'tlc-datasci': "Data Science template. a4paper 11pt. Sections: Objective, Technical Skills table (Languages | Libraries | Tools | Databases), Projects (ML-heavy first, include accuracy metrics), Education, Certifications, Activities.",
            'harshibar': "Harshibar modern: sfdefault font, fontawesome5 icons in header. Single column. Sections: Experience, Projects, Education, Skills.",
            'anubhav': "Anubhav campus a4. Bold name header. Sections: Education (CGPA table), Skills Summary, Projects, Internships, Certifications, Positions of Responsibility, Achievements."
        };
        var STEPS = ['Parsing job description', 'Extracting required keywords', 'Analysing resume gaps', 'Tailoring bullet points', 'Generating LaTeX document', 'Composing cover letter', 'Running ATS simulation'];

        var mode = 'latex', selTpl = 'jake-classic', R = {}, isGen = false, stepTmr = null, lastWD = false;
        var ec = { edu: 0, exp: 0, proj: 0, cert: 0, ach: 0 };

        /* ════════════════════════════════════════
           UTILS
        ════════════════════════════════════════ */
        function ex(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
        function gv(id) { var x = document.getElementById(id); return x ? x.value : ''; }
        function tv(id) { var x = document.getElementById(id); return x ? x.checked : true; }
        function smoothTo(id) {
            var el = document.getElementById(id);
            if (!el) return false;
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            el.classList.remove('scroll-highlight');
            void el.offsetWidth; /* force reflow to restart animation */
            el.classList.add('scroll-highlight');
            setTimeout(function () { el.classList.remove('scroll-highlight'); }, 600);
            return false;
        }
        function scrollToHero() {
            var hero = document.querySelector('.hero');
            if (hero) hero.scrollIntoView({ behavior: 'smooth' });
        }

        /* ════════════════════════════════════════
           THEME
        ════════════════════════════════════════ */
        var isDark = false;
        function toggleTheme() {
            isDark = !isDark;
            document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            document.getElementById('theme-ico').textContent = isDark ? '☾' : '☀';
            document.getElementById('theme-lbl').textContent = isDark ? 'Dark' : 'Light';
            try { localStorage.setItem('re-theme', isDark ? 'dark' : 'light'); } catch (e) { }
        }
        (function () {
            try {
                var saved = localStorage.getItem('re-theme');
                if (saved === 'dark') {
                    isDark = true;
                    document.documentElement.setAttribute('data-theme', 'dark');
                    document.getElementById('theme-ico').textContent = '☾';
                    document.getElementById('theme-lbl').textContent = 'Dark';
                }
            } catch (e) { }
        })();


        /* ════════════════════════════════════════
           TEMPLATE INIT
        ════════════════════════════════════════ */
        function initTpls() {
            ['tl-latex', 'tl-form'].forEach(function (lid) {
                var c = document.getElementById(lid); if (!c) return;
                c.innerHTML = TPLS.map(function (t) {
                    var badge = t.id === 'jake-classic' ? '<span class="ats-badge ab5">ATS</span>' : '';
                    return '<div class="tpl-item' + (t.def ? ' sel' : '') + '" data-id="' + t.id + '" onclick="pickTpl(this,\'' + lid + '\')">' +
                        '<div class="tpl-radio"></div>' +
                        '<div class="tpl-info"><div class="tpl-name">' + t.name + '</div><div class="tpl-desc">' + t.desc + '</div></div>' +
                        badge + '</div>';
                }).join('');
            });
        }
        function pickTpl(el, lid) {
            document.querySelectorAll('#' + lid + ' .tpl-item').forEach(function (r) { r.classList.remove('sel'); });
            el.classList.add('sel');
            selTpl = el.dataset.id;
        }

        /* ════════════════════════════════════════
           MODE SWITCH
        ════════════════════════════════════════ */
        function setMode(m) {
            mode = m;
            document.getElementById('mbL').classList.toggle('on', m === 'latex');
            document.getElementById('mbF').classList.toggle('on', m === 'form');
            document.getElementById('mode-latex').style.display = m === 'latex' ? 'block' : 'none';
            document.getElementById('mode-form').style.display = m === 'form' ? 'block' : 'none';
            var inputZone = document.querySelector('.input-zone');
            if (inputZone) {
                inputZone.scrollIntoView({ behavior: 'smooth' });
            }
        }

        /* ════════════════════════════════════════
           ACCORDION
        ════════════════════════════════════════ */
        function toggleSec(hd) {
            var body = hd.nextElementSibling;
            var ch = hd.querySelector('.chev');
            var isOpen = !body.classList.contains('closed');
            body.classList.toggle('closed', isOpen);
            if (ch) ch.classList.toggle('open', !isOpen);
        }

        /* ════════════════════════════════════════
           ENTRY CARDS
        ════════════════════════════════════════ */
        function addEntry(type) {
            var list = document.getElementById(type + '-list'); if (!list) return;
            ec[type]++; var n = ec[type];
            var uid = type + n + 'x' + Date.now();
            var card = document.createElement('div'); card.className = 'entry'; card.id = uid;
            var rm = '<button class="rm" onclick="document.getElementById(\'' + uid + '\').remove()" title="Remove">&#x2715;</button>';
            var hd = '<div class="entry-hd"><span class="entry-n">' + type + ' 0' + n + '</span>' + rm + '</div>';
            if (type === 'edu') {
                card.innerHTML = hd + '<div class="fg">' +
                    '<div class="ff full"><label>Institution</label><input type="text" placeholder="Vishnu Institute of Technology, Bhimavaram"></div>' +
                    '<div class="ff full"><label>Degree &amp; Branch</label><input type="text" placeholder="B.Tech in Computer Science (AI &amp; DS)"></div>' +
                    '<div class="ff"><label>Start Year</label><input type="text" placeholder="2023"></div>' +
                    '<div class="ff"><label>End / Expected</label><input type="text" placeholder="2027 (Expected)"></div>' +
                    '<div class="ff"><label>CGPA / Percentage</label><input type="text" placeholder="8.33 / 10"></div>' +
                    '<div class="ff"><label>Location</label><input type="text" placeholder="Bhimavaram, AP"></div>' +
                    '<div class="ff full"><label>Relevant Coursework</label><input type="text" placeholder="DSA, DBMS, OS, ML, CN, Software Engineering"></div></div>';
            } else if (type === 'proj') {
                card.innerHTML = hd + '<div class="fg">' +
                    '<div class="ff"><label>Project Name</label><input type="text" placeholder="AgriVision"></div>' +
                    '<div class="ff"><label>Tech Stack</label><input type="text" placeholder="Python, Flask, React, Firebase"></div>' +
                    '<div class="ff"><label>Duration</label><input type="text" placeholder="Jan 2024 - Mar 2024"></div>' +
                    '<div class="ff"><label>GitHub / Demo Link</label><input type="text" placeholder="github.com/you/agrivision"></div>' +
                    '<div class="ff full"><label>One-line Description</label><input type="text" placeholder="ML system recommending crops based on soil and weather data"></div>' +
                    '<div class="ff full"><label>Key Bullets (one per line, action verbs + numbers)</label>' +
                    '<textarea rows="4" placeholder="Trained Random Forest model achieving 91.4% accuracy&#10;Built REST API with Flask serving 300+ daily predictions&#10;Deployed on Render with 99.7% uptime"></textarea></div></div>';
            } else if (type === 'exp') {
                card.innerHTML = hd + '<div class="fg">' +
                    '<div class="ff"><label>Company / Organisation</label><input type="text" placeholder="SmartBridge Educational Services"></div>' +
                    '<div class="ff"><label>Role</label><input type="text" placeholder="Data Science Intern"></div>' +
                    '<div class="ff"><label>Duration</label><input type="text" placeholder="May 2025 - Jul 2025"></div>' +
                    '<div class="ff"><label>Location / Mode</label><input type="text" placeholder="Remote"></div>' +
                    '<div class="ff full"><label>Key Bullets (one per line, quantify impact)</label>' +
                    '<textarea rows="4" placeholder="Analysed 50k-row sales dataset with Python and SQL&#10;Built Tableau dashboard adopted by 4 business units&#10;Automated weekly report pipeline, saving 6 hours/week"></textarea></div></div>';
            } else if (type === 'cert') {
                card.innerHTML = hd + '<div class="fg">' +
                    '<div class="ff full"><label>Certification &amp; Issuer</label><input type="text" placeholder="Programming in Java - NPTEL (IIT Kharagpur)"></div>' +
                    '<div class="ff"><label>Platform</label><input type="text" placeholder="NPTEL / Coursera / Kaggle"></div>' +
                    '<div class="ff"><label>Year</label><input type="text" placeholder="2024"></div></div>';
            } else if (type === 'ach') {
                card.innerHTML = hd + '<div class="fg">' +
                    '<div class="ff full"><label>Achievement / Activity</label><input type="text" placeholder="Finalist - Smart India Hackathon 2024 (Internal Round), VIT"></div>' +
                    '<div class="ff full"><label>Brief Details (optional)</label><input type="text" placeholder="Built AgriVision; top 3 of 40 teams in department"></div></div>';
            }
            list.appendChild(card);
        }

        /* ════════════════════════════════════════
           BUILD FORM TEXT
        ════════════════════════════════════════ */
        function buildForm() {
            var t = 'NAME: ' + gv('f-name') + '\nPHONE: ' + gv('f-phone') + ' | EMAIL: ' + gv('f-email') + ' | LOCATION: ' + gv('f-loc') + '\nLINKEDIN: ' + gv('f-linkedin') + ' | GITHUB: ' + gv('f-github');
            var p = gv('f-portfolio'); if (p) t += ' | PORTFOLIO: ' + p;
            t += '\n\nOBJECTIVE:\n' + gv('f-obj') + '\n\n';
            document.querySelectorAll('#edu-list .entry').forEach(function (x) {
                var i = x.querySelectorAll('input');
                t += 'EDU: ' + i[0].value + ' | ' + i[1].value + ' | ' + i[2].value + ' - ' + i[3].value + ' | CGPA: ' + i[4].value + ' | ' + i[5].value + '\nCoursework: ' + i[6].value + '\n\n';
            });
            t += 'SKILLS:\nLanguages: ' + gv('f-langs') + '\nFrameworks: ' + gv('f-fw') + '\nDatabases: ' + gv('f-db') + '\nTools: ' + gv('f-tools') + '\nML/Data: ' + gv('f-ml') + '\nCloud: ' + gv('f-cloud') + '\n\n';
            document.querySelectorAll('#proj-list .entry').forEach(function (x) {
                var i = x.querySelectorAll('input'), ta = x.querySelector('textarea');
                t += 'PROJECT: ' + i[0].value + ' | Stack: ' + i[1].value + ' | ' + i[2].value + ' | ' + i[3].value + '\nDesc: ' + i[4].value + '\n' + (ta ? ta.value : '') + '\n\n';
            });
            document.querySelectorAll('#exp-list .entry').forEach(function (x) {
                var i = x.querySelectorAll('input'), ta = x.querySelector('textarea');
                t += 'EXPERIENCE: ' + i[0].value + ' | ' + i[1].value + ' | ' + i[2].value + ' | ' + i[3].value + '\n' + (ta ? ta.value : '') + '\n\n';
            });
            document.querySelectorAll('#cert-list .entry').forEach(function (x) {
                var i = x.querySelectorAll('input');
                t += 'CERT: ' + i[0].value + ' | ' + i[1].value + ' | ' + i[2].value + '\n';
            }); t += '\n';
            document.querySelectorAll('#ach-list .entry').forEach(function (x) {
                var i = x.querySelectorAll('input');
                t += 'ACHIEVEMENT: ' + i[0].value + ' - ' + i[1].value + '\n';
            });
            return t;
        }

        /* ════════════════════════════════════════
           SCORE CLASS
        ════════════════════════════════════════ */
        function scCls(n, mx) { return n >= mx * 0.8 ? 'hi' : n >= mx * 0.6 ? 'mid' : 'lo'; }

        /* ════════════════════════════════════════
           RENDER OUTPUTS
        ════════════════════════════════════════ */
        function renderAll() {
            var oz = document.getElementById('output-zone');
            oz.classList.remove('hidden');
            oz.innerHTML = '';

            // Diff card only renders when: LaTeX mode + diff toggle ON + AI returned diff data
            var showDiff = lastWD && (R.diff || []).length > 0;

            var allCards = [
                { id: 'ats',          num: '01', lbl: 'ATS Report',   fn: buildATS },
                { id: 'latex-out',    num: '02', lbl: 'LaTeX Code',   fn: buildLatex },
                { id: 'diff-out',     num: '03', lbl: 'Diff',         fn: buildDiff,      skip: !showDiff },
                { id: 'cover-out',    num: '04', lbl: 'Cover Letter', fn: buildCover },
                { id: 'preview-out',  num: '05', lbl: 'PDF Preview',  fn: buildPDF },
                { id: 'checklist-out',num: '06', lbl: 'Checklist',    fn: buildChecklist }
            ];

            // Re-number visible cards sequentially
            var visNum = 0;
            allCards.forEach(function (c) {
                if (c.skip) return;
                visNum++;
                var num = (visNum < 10 ? '0' : '') + visNum;
                var div = document.createElement('div');
                div.className = 'ocard';
                div.id = c.id;
                div.style.animationDelay = ((visNum - 1) * 0.06) + 's';
                div.innerHTML = '<div class="ocard-lbl"><span class="lbl-num">' + num + '</span>' + c.lbl + '</div>' + c.fn();
                oz.appendChild(div);
            });

            // Update jump nav — hide Diff link when card is not shown
            var diffLink = document.querySelector('.jlink[href="#diff-out"]');
            if (diffLink) diffLink.style.display = showDiff ? 'block' : 'none';

            document.getElementById('jump-nav').classList.add('visible');
            setTimeout(function () { oz.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
        }

        function buildATS() {
            var d = R.ats || {}; var ms = d.matchScore || 0, as = d.atsScore || 0;
            return '<div class="score-grid">' +
                '<div class="sc ' + scCls(ms, 10) + '"><div class="sc-n">' + ms + '<span style="font-size:22px;color:var(--muted)">/10</span></div><div class="sc-l">JD Match</div><div class="sc-bar"><div class="sc-fill" style="width:' + (ms / 10 * 100) + '%"></div></div></div>' +
                '<div class="sc ' + scCls(as, 100) + '"><div class="sc-n">' + as + '<span style="font-size:22px;color:var(--muted)">/100</span></div><div class="sc-l">ATS Score</div><div class="sc-bar"><div class="sc-fill" style="width:' + as + '%"></div></div></div>' +
                '</div>' +
                '<span class="subsec-lbl">Missing keywords — add these</span>' +
                '<div class="chips">' + ((d.missingKeywords || []).map(function (k) { return '<span class="chip chip-miss">' + ex(k) + '</span>'; }).join('') || '<span class="chip chip-neu">None — great match</span>') + '</div>' +
                '<span class="subsec-lbl">Present keywords — already matching</span>' +
                '<div class="chips">' + ((d.presentKeywords || []).map(function (k) { return '<span class="chip chip-hit">' + ex(k) + '</span>'; }).join('') || '<span class="chip chip-neu">—</span>') + '</div>' +
                '<span class="subsec-lbl">Analysis</span><div class="atext">' + (d.analysis || '—') + '</div>' +
                '<span class="subsec-lbl">Skills gaps</span><div class="atext">' + (d.skillsGaps || 'No major gaps identified.') + '</div>';
        }

        function buildLatex() {
            return '<div class="code-meta">Template: <span>' + ex(selTpl) + '</span> &nbsp;·&nbsp; Copy to Overleaf, compile, export PDF</div>' +
                '<div class="code-box">' + ex(R.latex || 'LaTeX will appear here after generation.') + '</div>' +
                '<button class="cpbtn" id="cb-l" onclick="cpTxt(R.latex,\'cb-l\')">Copy LaTeX code</button>';
        }

        function buildDiff() {
            var diff = R.diff || [];
            if (!diff.length) return '<p class="atext">Enable the diff toggle and run in LaTeX mode to see changes.</p>';
            return '<div class="diff-box">' + diff.map(function (l) {
                if (l[0] === '+') return '<div class="dl dla">' + ex(l) + '</div>';
                if (l[0] === '-') return '<div class="dl dlr">' + ex(l) + '</div>';
                return '<div class="dl dlc">' + ex(l) + '</div>';
            }).join('') + '</div>';
        }

        function buildCover() {
            var cov = R.cover || '';
            return '<p class="atext" style="margin-bottom:14px">Personalise the salutation with the hiring manager\'s name if known.</p>' +
                '<div class="cover-box">' + ex(cov || 'Cover letter will appear here after generation.') + '</div>' +
                (cov ? '<button class="cpbtn" id="cb-c" onclick="cpTxt(R.cover,\'cb-c\')">Copy cover letter</button>' : '');
        }

        function buildPDF() {
            var latex = R.latex || '';
            if (!latex) return '<div class="pdf-empty">Generate a resume first, then preview it here.</div>';
            return '<div class="pdf-bar"><span class="pdf-meta">Approximate HTML preview</span>' +
                '<div class="pdf-actions">' +
                '<button class="pdf-action" id="pcp" onclick="cpTxt(R.latex,\'pcp\')">Copy LaTeX</button>' +
                '<button class="pdf-action" onclick="window.open(\'https://www.overleaf.com\',\'_blank\')">Open Overleaf ↗</button>' +
                '</div></div>' +
                parsePDF(latex) +
                '<p class="pdf-hint">Approximate only. Compile on <a href="https://www.overleaf.com" target="_blank">Overleaf</a> for the exact PDF.</p>';
        }

        function buildChecklist() {
            var d = R.ats || {}; var ms = d.matchScore || 0, as = d.atsScore || 0;
            var items = [
                { t: 'Match score 8/10 or above (yours: ' + ms + '/10)', p: ms >= 8 },
                { t: 'ATS score 90/100 or above (yours: ' + as + ')', p: as >= 90 },
                { t: 'LaTeX code generated', p: !!R.latex },
                { t: 'Fewer than 3 missing keywords', p: (d.missingKeywords || []).length < 3 },
                { t: 'No tables or graphics (ATS safe)', p: true },
                { t: 'Cover letter ready', p: !!R.cover }
            ];
            var allPass = items.every(function (i) { return i.p; });
            return '<div class="chk-list">' + items.map(function (i) {
                return '<div class="ci ' + (i.p ? 'pass' : 'fail') + '"><span class="ci-ico">' + (i.p ? 'pass' : 'fail') + '</span><span class="ci-txt">' + i.t + '</span></div>';
            }).join('') + '</div>' +
                '<div class="verdict ' + (allPass ? 'ok' : 'wait') + '">' +
                (allPass ? 'Ready to apply. Copy the LaTeX, compile on Overleaf, export PDF, and submit.' : 'Not quite ready — review the ATS Report and integrate missing keywords.') +
                '</div>';
        }

        /* ════════════════════════════════════════
           PDF PREVIEW PARSER (preserved exactly)
        ════════════════════════════════════════ */
        function parsePDF(latex) {
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
                            h += '<div class="pdf-entry"><div class="pdf-hd"><span>' + ex(s.o) + '</span><span>' + ex(s.d) + '</span></div>' +
                                '<div class="pdf-sub"><span>' + ex(s.r) + '</span><span>' + ex(s.l) + '</span></div>';
                            var eb = bullets.slice(si * 3, si * 3 + 3);
                            if (eb.length) h += '<ul class="pdf-ul">' + eb.map(function (x) { return '<li>' + ex(x.slice(0, 120)) + '</li>'; }).join('') + '</ul>';
                            h += '</div>';
                        });
                    } else if (bullets.length) {
                        h += '<ul class="pdf-ul">' + bullets.slice(0, 8).map(function (x) { return '<li>' + ex(x.slice(0, 120)) + '</li>'; }).join('') + '</ul>';
                    } else {
                        var raw = sec.b.replace(/\\[a-zA-Z]+(\[[^\]]*\])?\{?/g, '').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, 180);
                        if (raw) h += '<p style="font-size:8.5px;color:#555">' + ex(raw) + '</p>';
                    }
                });
                if (!secs.length) h += '<p style="font-size:9px;text-align:center;color:#888;padding:20px">LaTeX generated — open in Overleaf to render.</p>';
                return h + '</div>';
            } catch (e) { return '<div class="pdf-empty">LaTeX generated — open in Overleaf for accurate rendering.</div>'; }
        }

        /* ════════════════════════════════════════
           COPY TO CLIPBOARD
        ════════════════════════════════════════ */
        function cpTxt(text, id) {
            navigator.clipboard.writeText(text || '').then(function () {
                var b = document.getElementById(id); if (!b) return;
                var orig = b.textContent; b.textContent = 'Copied ✓'; b.classList.add('ok');
                setTimeout(function () { b.textContent = orig; b.classList.remove('ok'); }, 2000);
            });
        }

        /* ════════════════════════════════════════
           LOADING ANIMATION
        ════════════════════════════════════════ */
        function showLoading() {
            var oz = document.getElementById('output-zone');
            oz.classList.remove('hidden');
            oz.innerHTML = '<div class="loading-zone">' +
                '<div class="ls-eyebrow">— Working on it</div>' +
                '<ul class="ls-steps">' +
                STEPS.map(function (s, i) {
                    return '<li class="ls-step" id="st' + i + '"><span class="ls-step-n">0' + (i + 1) + '</span><span>' + s + '</span></li>';
                }).join('') + '</ul></div>';
            oz.scrollIntoView({ behavior: 'smooth', block: 'start' });
            var s = 0; if (stepTmr) clearInterval(stepTmr);
            stepTmr = setInterval(function () {
                if (s > 0) { var p = document.getElementById('st' + (s - 1)); if (p) { p.classList.remove('on'); p.classList.add('done'); } }
                var c = document.getElementById('st' + s); if (c) c.classList.add('on');
                s++; if (s >= STEPS.length) clearInterval(stepTmr);
            }, 2600);
        }

        /* ════════════════════════════════════════
           GENERATE
        ════════════════════════════════════════ */
        async function generate() {
            if (isGen) return;
            var isL = mode === 'latex';
            var jd = (isL ? gv('jd-latex') : gv('jd-form')).trim();
            
            var resume = '';
            var isPDF = false;
            if (isL) {
                if (uploadedPDFText) {
                    resume = uploadedPDFText;
                    isPDF = true;
                } else {
                    resume = gv('latex-input').trim();
                }
            } else {
                resume = buildForm().trim();
            }

            if (!jd) { alert('Please paste a job description first.'); return; }
            if (!resume) { alert(isL ? 'Please paste your LaTeX resume or upload a PDF.' : 'Please fill in at least your basic details.'); return; }

            var apiKey = document.getElementById('api-key-input').value.trim();
            if (!apiKey) { try { apiKey = localStorage.getItem('re-apikey-' + selProvider) || ''; } catch (e) { } }
            if (!apiKey) { alert('API key required. Click the Keys button in the nav and paste your key.'); return; }

            isGen = true; R = {};
            var btn = document.getElementById('run-btn');
            btn.disabled = true;
            document.getElementById('run-ico').innerHTML = '<span class="spin"></span>';
            document.getElementById('run-lbl').textContent = 'Generating…';

            var tp = document.getElementById('top-prog');
            tp.style.width = '0%'; tp.classList.add('live');

            showLoading();
            setTimeout(function () { tp.style.width = '30%'; }, 200);

            var wC = tv(isL ? 'tc-l' : 'tc-f');
            var wD = isPDF ? false : (isL && tv('td-l'));
            lastWD = wD; // store for renderAll to reference
            var hint = HINTS[selTpl] || HINTS['jake-classic'];

            var resumeType = isPDF ? "plain text extracted from PDF" : (isL ? "LaTeX" : "form data");
            var sys = "You are an expert resume engineer and ATS specialist for early-career/fresher candidates.\n\nTEMPLATE:\n" + hint + "\n\nRespond ONLY with a single valid JSON object. No markdown fences, no preamble.\n\nSchema: {\"ats\":{\"matchScore\":<1-10>,\"atsScore\":<1-100>,\"missingKeywords\":[],\"presentKeywords\":[],\"analysis\":\"<HTML ul/li/strong>\",\"skillsGaps\":\"<HTML>\"},\"latex\":\"<complete LaTeX - backslashes doubled as \\\\\\\\, newlines as \\\\n>\",\"diff\":[],\"cover\":\"<~180 word plain text or empty string>\"}\n\nRules: strong action verbs, quantify every bullet, integrate missing keywords naturally, keep to ONE PAGE. wantCover=" + wC + ". wantDiff=" + wD + ". Set cover to empty string if false, diff to empty array if false." + (isPDF ? " IMPORTANT: The candidate has provided their base resume in plain text. Format the final tailored resume entirely into the specified LaTeX template structure." : "");
            var usr = "RESUME (" + resumeType + "):\n" + resume + "\n\nJOB DESCRIPTION:\n" + jd + "\n\nGenerate JSON.";

            try {
                var raw = await callAI(sys, usr);
                tp.style.width = '88%';
                var parsed;
                console.log('Raw AI response:', raw);
                // Check for empty response
                if (!raw || raw.trim() === '') {
                    throw new Error('Empty response from AI provider');
                }
                try { parsed = JSON.parse(raw); } catch (e) { console.error('JSON parse error:', e); var m = raw.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Could not parse response — please try again.'); }
                R = parsed;
                tp.style.width = '100%';
                setTimeout(function () {
                    tp.style.width = '0%'; tp.classList.remove('live');
                }, 500);
            } catch (err) {
                R = { ats: { matchScore: 0, atsScore: 0, missingKeywords: [], presentKeywords: [], analysis: '<strong>Error:</strong> ' + ex(err.message), skillsGaps: '' }, latex: '', diff: [], cover: '' };
                tp.style.width = '0%'; tp.classList.remove('live');
            }

            if (stepTmr) clearInterval(stepTmr);
            isGen = false;
            btn.disabled = false;
            document.getElementById('run-ico').textContent = '⚡';
            document.getElementById('run-lbl').textContent = 'Generate tailored resume';
            renderAll();
        }

        /* ════════════════════════════════════════
           INIT
        ════════════════════════════════════════ */
        (function init() {
            // Default: Gemini · Gemini 2.0 Flash
            selProvider = 'gemini';
            selModel = 'gemini-2.0-flash';
            updateBadge();
            loadKey();
            initTpls();
            ['edu', 'proj', 'cert', 'ach'].forEach(function (t) { addEntry(t); });

            // Toggle keys dropdown on click
            var keysWrap = document.querySelector('.keys-btn-wrap');
            var keysBtn = document.getElementById('keys-btn');
            if (keysBtn && keysWrap) {
                keysBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    keysWrap.classList.toggle('open');
                });
                var keysDropdown = keysWrap.querySelector('.keys-dropdown');
                if (keysDropdown) {
                    keysDropdown.addEventListener('click', function (e) {
                        e.stopPropagation();
                    });
                }
                document.addEventListener('click', function () {
                    keysWrap.classList.remove('open');
                });
            }
        })();
