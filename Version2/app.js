        'use strict';

        // â”€â”€ STATE â”€â”€
        var provider = 'gemini', apiKey = '', isDark = false, wC = true;
        var mode = 'source', selTpl = 'jake-classic', R = {}, isGen = false, stepTmr = null;
        var ec = { edu: 0, proj: 0, exp: 0, cert: 0, ach: 0 };
        var openrouterModel = 'google/gemini-2.5-flash';

        // â”€â”€ FILE UPLOAD STATE â”€â”€
        var fileBase64 = '', fileType = '', fileName = '', fileSizeKb = 0, fileText = '';

        var PROVIDER_META = {
            gemini: {
                label: 'Gemini API', keyLabel: 'Google AI Studio Key', placeholder: 'AIzaSyâ€¦',
                hint: 'Get your key at <a href="https://aistudio.google.com" target="_blank">aistudio.google.com</a>. Very generous free tier.'
            },
            openrouter: {
                label: 'OpenRouter', keyLabel: 'OpenRouter API Key', placeholder: 'sk-or-v1-â€¦',
                hint: 'Get your key at <a href="https://openrouter.ai" target="_blank">openrouter.ai</a>.'
            }
        };

        var TPLS = [
            { id: 'jake-classic', name: 'Jake Classic', desc: 'CS/SWE single-col, letterpaper, ATS gold standard', ats: '5/5', ab: 'ab5', def: true },
            { id: 'datta-custom', name: 'Datta Custom', desc: 'A4, multi-col skills, India placements', ats: '5/5', ab: 'ab5' },
            { id: 'tlc-datasci', name: 'TLC Data Sci', desc: 'ML / Data Science focused roles', ats: '4/5', ab: 'ab4' },
            { id: 'harshibar', name: 'Harshibar Modern', desc: 'Sans-serif, icons, stylish', ats: '4/5', ab: 'ab4' },
            { id: 'anubhav', name: 'Anubhav Detailed', desc: 'Campus placements, India-focused', ats: '3/5', ab: 'ab3' }
        ];

        var HINTS = {
            'jake-classic': "Jake Ryan ATS template. \\documentclass[letterpaper,11pt]{article}. Packages: latexsym, fullpage, titlesec, marvosym, color, verbatim, enumitem, hyperref, fancyhdr, babel. \\pdfgentounicode=1. Single column. \\titlerule section headers. Commands: \\resumeItem{text}, \\resumeSubheading{Company}{Date}{Role}{Location}, \\resumeProjectHeading{\\textbf{Project} $|$ \\emph{Stack}}{Date}. Section order: Education, Technical Skills, Projects, Experience (if any), Certifications (if any), Extracurricular. No tables, no graphics, no color â€” pure ATS safe.",
            'datta-custom': "\\documentclass[a4paper,11pt]{article}. \\usepackage[left=0.9cm,right=0.9cm,top=0.6cm,bottom=0.7cm]{geometry}. \\usepackage{enumitem,hyperref,titlesec,parskip,multicol}. \\pagenumbering{gobble}. Section order: Objective, Education, Technical Skills (multicols{2}), Projects, Experience, Certifications, Achievements. Header: centered {\\Large \\textbf{Name}}, contact line.",
            'tlc-datasci': "TLC Data Science. a4paper 11pt. Sections: Objective, Technical Skills table (Languages|Libraries|Tools|Databases), Projects (ML-heavy first, include accuracy metrics and dataset sizes), Education, Certifications, Activities.",
            'harshibar': "Harshibar modern: sfdefault font, fontawesome5 icons in header. Single column. Sections: Experience, Projects, Education, Skills.",
            'anubhav': "Anubhav campus a4. Bold name header. Sections: Education (CGPA table), Skills Summary, Projects, Internships, Certifications, Positions of Responsibility, Achievements."
        };

        var STEPS = ['Parsing job description', 'Extracting keywords', 'Analysing gaps', 'Tailoring bullets', 'Generating LaTeX', 'Composing cover letter', 'Running ATS simulation'];

        // â”€â”€ UTILS â”€â”€
        function ex(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
        function gv(id) { var x = document.getElementById(id); return x ? x.value : ''; }
        function tv(id) { var x = document.getElementById(id); return x ? x.checked : true; }
        function scCls(n, mx) { return n >= mx * .8 ? 'hi' : n >= mx * .6 ? 'mid' : 'lo'; }

        // Copy text to clipboard and show feedback on button
        function cpTxt(text, btnId) {
            navigator.clipboard.writeText(text || '').then(function () {
                var b = document.getElementById(btnId); if (!b) return;
                var orig = b.textContent;
                b.textContent = 'Copied âœ“'; b.classList.add('ok');
                setTimeout(function () { b.textContent = orig; b.classList.remove('ok'); }, 2000);
            }).catch(function () { alert('Copy failed â€” please select and copy manually.'); });
        }

        // Show a custom popup toast notification
        function showToast(message) {
            var toast = document.createElement('div');
            toast.className = 'toast';
            toast.textContent = message;
            toast.style.cssText = 'background: var(--ink); color: var(--paper); font-family: var(--mono); font-size: 11px; padding: 8px 16px; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 8px; transition: opacity 0.15s ease, transform 0.15s ease;';
            var container = document.getElementById('toast-container');
            container.appendChild(toast);
            setTimeout(function() {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px)';
                setTimeout(function() { toast.remove(); }, 150);
            }, 1500);
        }

        // Copy chip text to clipboard and show toast
        function copyChipText(text, el) {
            navigator.clipboard.writeText(text).then(function() {
                showToast('Copied âœ“');
            }).catch(function() {
                alert('Copy failed');
            });
        }

        // Open in Overleaf using the URL API
        function openOverleaf() {
            if (!R.latex) return;
            var url = 'https://www.overleaf.com/docs?snip=' + encodeURIComponent(R.latex);
            window.open(url, '_blank');
        }

        // â”€â”€ THEME â”€â”€
        function toggleTheme() {
            isDark = !isDark;
            document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            document.getElementById('theme-ico').textContent = isDark ? 'â˜¾' : 'â˜€';
            try { localStorage.setItem('re-theme', isDark ? 'dark' : 'light'); } catch (e) { }
        }
        (function () {
            try {
                if (localStorage.getItem('re-theme') === 'dark') {
                    isDark = true;
                    document.documentElement.setAttribute('data-theme', 'dark');
                    document.getElementById('theme-ico').textContent = 'â˜¾';
                }
            } catch (e) { }
        })();

        // â”€â”€ SETTINGS MODAL â”€â”€
        function selectProvider(p, btn) {
            provider = p;
            document.querySelectorAll('.ptab').forEach(function (t) { t.classList.remove('on'); });
            btn.classList.add('on');
            
            var keyInput = document.getElementById('api-key-input');
            var modelGroup = document.getElementById('model-select-group');
            var keyLabel = document.getElementById('key-label');
            var keyHint = document.getElementById('key-hint');
            
            if (p === 'gemini') {
                modelGroup.style.display = 'none';
                keyLabel.textContent = 'Google AI Studio Key';
                keyInput.placeholder = 'AIzaSyâ€¦';
                keyHint.innerHTML = 'Get your key at <a href="https://aistudio.google.com" target="_blank">aistudio.google.com</a>. Very generous free tier.';
                keyInput.value = localStorage.getItem('re-key-gemini') || '';
            } else {
                modelGroup.style.display = 'block';
                keyLabel.textContent = 'OpenRouter API Key';
                keyInput.placeholder = 'sk-or-v1-â€¦';
                keyHint.innerHTML = 'Get your key at <a href="https://openrouter.ai" target="_blank">openrouter.ai</a>.';
                keyInput.value = localStorage.getItem('re-key-openrouter') || '';
                document.getElementById('api-model-select').value = localStorage.getItem('re-model-openrouter') || 'google/gemini-2.5-flash';
            }
            document.getElementById('modal-warn').style.display = 'none';
        }

        function openModal() {
            var overlay = document.getElementById('settings-modal');
            overlay.classList.remove('hidden');
            
            var savedKey = (provider === 'gemini') ? localStorage.getItem('re-key-gemini') : localStorage.getItem('re-key-openrouter');
            document.getElementById('modal-cancel').style.display = savedKey ? 'block' : 'none';
            
            var keyInput = document.getElementById('api-key-input');
            keyInput.value = savedKey || '';
            
            document.querySelectorAll('.ptab').forEach(function (t) { 
                t.classList.toggle('on', t.dataset.p === provider); 
            });
            
            var modelGroup = document.getElementById('model-select-group');
            var keyLabel = document.getElementById('key-label');
            var keyHint = document.getElementById('key-hint');
            
            if (provider === 'gemini') {
                modelGroup.style.display = 'none';
                keyLabel.textContent = 'Google AI Studio Key';
                keyInput.placeholder = 'AIzaSyâ€¦';
                keyHint.innerHTML = 'Get your key at <a href="https://aistudio.google.com" target="_blank">aistudio.google.com</a>. Very generous free tier.';
            } else {
                modelGroup.style.display = 'block';
                keyLabel.textContent = 'OpenRouter API Key';
                keyInput.placeholder = 'sk-or-v1-â€¦';
                keyHint.innerHTML = 'Get your key at <a href="https://openrouter.ai" target="_blank">openrouter.ai</a>.';
                document.getElementById('api-model-select').value = localStorage.getItem('re-model-openrouter') || 'google/gemini-2.5-flash';
            }
        }

        function closeModal() { document.getElementById('settings-modal').classList.add('hidden'); }

        function saveSettings() {
            var key = document.getElementById('api-key-input').value.trim();
            if (!key) { document.getElementById('modal-warn').style.display = 'block'; return; }
            
            apiKey = key;
            try {
                localStorage.setItem('re-provider', provider);
                if (provider === 'gemini') {
                    localStorage.setItem('re-key-gemini', key);
                } else {
                    localStorage.setItem('re-key-openrouter', key);
                    var modelVal = document.getElementById('api-model-select').value;
                    localStorage.setItem('re-model-openrouter', modelVal);
                    openrouterModel = modelVal;
                }
            } catch (e) { }
            updateNavProvider();
            closeModal();
            updateFileNoteVisibility();
        }

        function updateNavProvider() {
            var labels = { gemini: 'Gemini API', openrouter: 'OpenRouter' };
            var labelStr = labels[provider] || 'Set API Key';
            if (provider === 'openrouter') {
                var modelVal = localStorage.getItem('re-model-openrouter') || openrouterModel;
                var shortModel = modelVal.split('/').pop();
                labelStr += ' (' + shortModel + ')';
            }
            document.getElementById('nav-provider-lbl').textContent = labelStr;
            
            var savedKey = (provider === 'gemini') ? localStorage.getItem('re-key-gemini') : localStorage.getItem('re-key-openrouter');
            document.getElementById('nav-dot').style.background = savedKey ? 'var(--accent)' : 'var(--warn)';
        }

        // Load saved settings
        (function () {
            try {
                var sp = localStorage.getItem('re-provider');
                if (sp) provider = sp;
                
                var geminiKey = localStorage.getItem('re-key-gemini');
                var orKey = localStorage.getItem('re-key-openrouter');
                var orModel = localStorage.getItem('re-model-openrouter');
                
                // Fallback to older 're-key' if present
                if (!geminiKey && !orKey) {
                    var oldKey = localStorage.getItem('re-key');
                    if (oldKey) {
                        if (provider === 'gemini') {
                            localStorage.setItem('re-key-gemini', oldKey);
                            geminiKey = oldKey;
                        } else {
                            localStorage.setItem('re-key-openrouter', oldKey);
                            orKey = oldKey;
                        }
                    }
                }
                
                if (orModel) openrouterModel = orModel;
                
                // Set initial active key
                apiKey = (provider === 'gemini') ? geminiKey : orKey;
                
                updateNavProvider();
                
                // Auto-open modal if no key is present for the current provider
                if (!apiKey) {
                    setTimeout(openModal, 400);
                }
            } catch (e) {
                setTimeout(openModal, 400);
            }
        })();

        // â”€â”€ MODE â”€â”€
        function setMode(m) {
            // [v4] refactored navigation modes and updated view displays
            mode = m;
            document.querySelectorAll('.nav-mid').forEach(function (nav) {
                var btnS = nav.querySelector('#mbS');
                var btnL = nav.querySelector('#mbL');
                var btnB = nav.querySelector('#mbB');
                if (btnS) btnS.classList.toggle('on', m === 'source');
                if (btnL) btnL.classList.toggle('on', m === 'latex');
                if (btnB) btnB.classList.toggle('on', m === 'build');
            });
            document.getElementById('mode-source').style.display = m === 'source' ? 'block' : 'none';
            document.getElementById('mode-latex').style.display = m === 'latex' ? 'block' : 'none';
            document.getElementById('mode-build').style.display = m === 'build' ? 'block' : 'none';
            updateFileNoteVisibility();
            updateJDFallbacks();
            updateModePill(m);
            var el = document.querySelector('.input-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }

        // â”€â”€ SOURCE SUB-MODES â”€â”€
        function setSourceMode(m) {
            // [v4] toggle between upload and paste input panes in the source mode
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

        // â”€â”€ MODE PILL INDICATOR â”€â”€
        function updateModePill(m) {
            // [v4] update persistent mode indicator pill text
            var labels = { source: 'Source', latex: 'LaTeX', build: 'Build' };
            var pill = document.getElementById('mode-pill-lbl');
            if (pill) pill.textContent = labels[m] || m;
        }

        // â”€â”€ PARSE BANNER TRIGGER â”€â”€
        function showSourceParseBanner() {
            // [v4] show parse banner indicating source content has been loaded
            var banner = document.getElementById('source-parse-banner');
            if (banner) banner.classList.remove('hidden');
        }

        // Add paste textarea input listener
        document.getElementById('source-paste-input').addEventListener('input', function() {
            if (this.value.trim().length > 50) {
                showSourceParseBanner();
            }
        });

        // â”€â”€ ACCORDION â”€â”€
        function toggleAcc(hd) {
            var body = hd.nextElementSibling;
            var ch = hd.querySelector('.acc-chev');
            var open = body.classList.contains('show');
            body.classList.toggle('show', !open);
            if (ch) ch.classList.toggle('open', !open);
        }

        // â”€â”€ FAQ â”€â”€
        function toggleFaq(q) {
            var a = q.nextElementSibling;
            q.classList.toggle('open');
            a.classList.toggle('show');
        }

        // â”€â”€ TEMPLATES â”€â”€
        function initTpls() {
            // [v4] update template rendering containers to match new tab IDs
            ['tl-source', 'tl-latex', 'tl-build'].forEach(function (lid) {
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

        // â”€â”€ FILE UPLOAD (PDF + TXT + MD) â”€â”€
        function initDropzone() {
            var dz = document.getElementById('pdf-dropzone'); if (!dz) return;
            ['dragenter', 'dragover'].forEach(function (e) {
                dz.addEventListener(e, function (ev) { ev.preventDefault(); ev.stopPropagation(); dz.classList.add('hover'); }, false);
            });
            ['dragleave', 'drop'].forEach(function (e) {
                dz.addEventListener(e, function (ev) { ev.preventDefault(); ev.stopPropagation(); dz.classList.remove('hover'); }, false);
            });
            dz.addEventListener('drop', function (ev) {
                var f = ev.dataTransfer.files; if (f && f.length) handleFile(f[0]);
            }, false);
        }

        function onFileSelect(e) { var f = e.target.files; if (f && f.length) handleFile(f[0]); }

        function handleFile(file) {
            var err = document.getElementById('pdf-err');
            err.style.display = 'none'; err.textContent = '';
            var ext = file.name.split('.').pop().toLowerCase();
            if (['pdf', 'txt', 'md'].indexOf(ext) === -1) {
                err.textContent = 'Only PDF, TXT, or MD files are supported.'; err.style.display = 'block'; return;
            }
            if (file.size > 10 * 1024 * 1024) {
                err.textContent = 'File size exceeds 10 MB limit.'; err.style.display = 'block'; return;
            }
            fileName = file.name; fileSizeKb = Math.round(file.size / 1024); fileType = ext;
            if (ext === 'pdf') {
                var reader = new FileReader();
                reader.onload = async function (e) {
                    var result = e.target.result;
                    fileBase64 = result.split(',')[1];
                    fileText = '';
                    showFileMeta();
                    try { 
                        fileText = await extractTextFromPdf(fileBase64); 
                    } catch (ex) { 
                        console.warn('PDF text extraction failed:', ex); 
                        showFileErr('PDF text extraction failed. Sending empty text placeholder.');
                    }
                    updateFileNoteVisibility();
                };
                reader.onerror = function () { showFileErr('Error reading file.'); };
                reader.readAsDataURL(file);
            } else {
                var tr = new FileReader();
                tr.onload = function (e) {
                    fileText = e.target.result;
                    fileBase64 = '';
                    showFileMeta();
                    updateFileNoteVisibility();
                };
                tr.onerror = function () { showFileErr('Error reading file.'); };
                tr.readAsText(file);
            }
        }

        function showFileErr(msg) {
            var err = document.getElementById('pdf-err'); err.textContent = msg; err.style.display = 'block';
        }

        function showFileMeta() {
            document.getElementById('pdf-dropzone').style.display = 'none';
            document.getElementById('pdf-meta-name').textContent = fileName;
            document.getElementById('pdf-meta-size').textContent = fileSizeKb + ' KB Â· ' + fileType.toUpperCase();
            document.getElementById('pdf-preview-box').style.display = 'flex';
            showSourceParseBanner(); // [v4] show parse banner on file load
        }

        function removeFile() {
            fileBase64 = ''; fileType = ''; fileName = ''; fileSizeKb = 0; fileText = '';
            document.getElementById('file-input').value = '';
            document.getElementById('pdf-dropzone').style.display = 'flex';
            document.getElementById('pdf-preview-box').style.display = 'none';
            document.getElementById('pdf-err').style.display = 'none';
            updateFileNoteVisibility();
            var banner = document.getElementById('source-parse-banner');
            if (banner) banner.classList.add('hidden'); // [v4] hide parse banner
        }

        function updateFileNoteVisibility() {
            var note = document.getElementById('pdf-note');
            if (note) note.style.display = (fileBase64 && fileType === 'pdf') ? 'block' : 'none';
        }

        // â”€â”€ PDF TEXT EXTRACTION via PDF.js â”€â”€
        async function extractTextFromPdf(base64Data) {
            var raw = window.atob(base64Data);
            var array = new Uint8Array(raw.length);
            for (var i = 0; i < raw.length; i++) array[i] = raw.charCodeAt(i);
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            var pdf = await pdfjsLib.getDocument({ data: array }).promise;
            var text = '';
            for (var p = 1; p <= pdf.numPages; p++) {
                var page = await pdf.getPage(p);
                var content = await page.getTextContent();
                text += content.items.map(function (item) { return item.str; }).join(' ') + '\n';
            }
            return text;
        }

        // â”€â”€ JD FALLBACK SYSTEM â”€â”€
        function updateJDFallbacks() {
            // [v4] refactored JD fallback fields visibility logic
            ['latex', 'source', 'build'].forEach(function(m) {
                var jdEl = document.getElementById('jd-' + m);
                if (!jdEl) return;
                var jdVal = jdEl.value.trim();
                var fallbackDiv = document.getElementById('fallback-' + m);
                var tooltipDiv = document.getElementById('tooltip-' + m);
                
                var roleEl = document.getElementById('role-' + m);
                var indEl = document.getElementById('ind-' + m);
                var roleVal = roleEl ? roleEl.value.trim() : '';
                var indVal = indEl ? indEl.value.trim() : '';
                
                if (jdVal === '') {
                    fallbackDiv.style.display = 'block';
                    if (roleVal === '' && indVal === '') {
                        tooltipDiv.style.display = 'block';
                    } else {
                        tooltipDiv.style.display = 'none';
                    }
                } else {
                    fallbackDiv.style.display = 'none';
                }
            });
        }

        // Setup input event listeners for fallback visibility updates
        // [v4] updated mode array to ['latex', 'source', 'build']
        ['latex', 'source', 'build'].forEach(function(m) {
            var jd = document.getElementById('jd-' + m);
            var r = document.getElementById('role-' + m);
            var i = document.getElementById('ind-' + m);
            if (jd) jd.addEventListener('input', updateJDFallbacks);
            if (r) r.addEventListener('input', updateJDFallbacks);
            if (i) i.addEventListener('input', updateJDFallbacks);
        });

        // â”€â”€ FORM BUILDER â”€â”€
        function addEntry(type) {
            var list = document.getElementById(type + '-list'); if (!list) return;
            ec[type]++; var n = ec[type];
            var uid = type + n + 'x' + Date.now();
            var card = document.createElement('div'); card.className = 'ecard'; card.id = uid;
            var rm = '<button class="ecard-rm" onclick="document.getElementById(\'' + uid + '\').remove()">âœ•</button>';
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
                    '<div class="ff"><label>Duration</label><input type="text" placeholder="Jan 2024 â€“ Mar 2024"></div>' +
                    '<div class="ff"><label>GitHub / Demo</label><input type="text" placeholder="github.com/you/project"></div>' +
                    '<div class="ff full"><label>Description</label><input type="text" placeholder="One-line description"></div>' +
                    '<div class="ff full"><label>Key Bullets (one per line, use numbers)</label>' +
                    '<textarea rows="4" placeholder="Trained model achieving 91% accuracy on 12k samples&#10;Built REST API serving 300+ daily requests&#10;Deployed on Render with 99.7% uptime"></textarea></div></div>';
            } else if (type === 'exp') {
                card.innerHTML = hd + '<div class="fg">' +
                    '<div class="ff"><label>Company</label><input type="text" placeholder="SmartBridge"></div>' +
                    '<div class="ff"><label>Role</label><input type="text" placeholder="Data Science Intern"></div>' +
                    '<div class="ff"><label>Duration</label><input type="text" placeholder="May 2025 â€“ Jul 2025"></div>' +
                    '<div class="ff"><label>Mode</label><input type="text" placeholder="Remote"></div>' +
                    '<div class="ff full"><label>Key Bullets (quantify impact)</label>' +
                    '<textarea rows="4" placeholder="Analysed 50k-row dataset; surfaced 3 revenue trends&#10;Built Tableau dashboard adopted by 4 teams&#10;Automated pipeline saving 6 hours/week"></textarea></div></div>';
            } else if (type === 'cert') {
                card.innerHTML = hd + '<div class="fg">' +
                    '<div class="ff full"><label>Certification &amp; Issuer</label><input type="text" placeholder="Programming in Java â€” NPTEL (IIT Kharagpur)"></div>' +
                    '<div class="ff"><label>Platform</label><input type="text" placeholder="NPTEL / Coursera / Kaggle"></div>' +
                    '<div class="ff"><label>Year</label><input type="text" placeholder="2024"></div></div>';
            } else if (type === 'ach') {
                card.innerHTML = hd + '<div class="fg">' +
                    '<div class="ff full"><label>Achievement / Activity</label><input type="text" placeholder="Finalist â€” Smart India Hackathon 2024, VIT"></div>' +
                    '<div class="ff full"><label>Details (optional)</label><input type="text" placeholder="Top 3 of 40 teams; built AgriVision"></div></div>';
            }
            list.appendChild(card);
        }

        function buildForm() {
            var t = 'NAME: ' + gv('f-name') + '\nPHONE: ' + gv('f-phone') + ' | EMAIL: ' + gv('f-email') + ' | LOCATION: ' + gv('f-loc') + '\nLINKEDIN: ' + gv('f-linkedin') + ' | GITHUB: ' + gv('f-github');
            var p = gv('f-portfolio'); if (p) t += ' | PORTFOLIO: ' + p;
            t += '\n\nOBJECTIVE:\n' + gv('f-obj') + '\n\n';
            document.querySelectorAll('#edu-list .ecard').forEach(function (x) {
                var i = x.querySelectorAll('input');
                t += 'EDU: ' + i[0].value + ' | ' + i[1].value + ' | ' + i[2].value + ' â€“ ' + i[3].value + ' | CGPA: ' + i[4].value + ' | ' + i[5].value + '\nCoursework: ' + i[6].value + '\n\n';
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
                t += 'ACHIEVEMENT: ' + i[0].value + ' â€” ' + i[1].value + '\n';
            });
            return t;
        }

        // â”€â”€ API CALLS â”€â”€

        // Call Google Gemini API (Google AI Studio)
        async function callGemini(sys, usr) {
            var activeKey = localStorage.getItem('re-key-gemini') || apiKey;
            if (!activeKey) throw new Error('Gemini API key is not set. Open API Settings.');
            
            var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + activeKey;
            
            var requestBody = {
                systemInstruction: {
                    parts: [{ text: sys }]
                },
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: usr }]
                    }
                ],
                generationConfig: {
                    maxOutputTokens: 8000,
                    temperature: 0.3,
                    responseMimeType: 'application/json'
                }
            };
            
            var resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            var data = await resp.json();
            if (data.error) throw new Error(data.error.message || 'Gemini API error');
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0].text) {
                throw new Error('Malformed API response from Gemini');
            }
            return data.candidates[0].content.parts[0].text;
        }

        // Call OpenRouter API
        async function callOpenRouter(sys, usr) {
            var activeKey = localStorage.getItem('re-key-openrouter') || apiKey;
            if (!activeKey) throw new Error('OpenRouter API key is not set. Open API Settings.');
            
            var activeModel = localStorage.getItem('re-model-openrouter') || openrouterModel;
            var url = 'https://openrouter.ai/api/v1/chat/completions';
            
            var requestBody = {
                model: activeModel,
                messages: [
                    { role: 'system', content: sys },
                    { role: 'user', content: usr }
                ],
                response_format: { type: 'json_object' }
            };
            
            var resp = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + activeKey
                },
                body: JSON.stringify(requestBody)
            });
            
            var data = await resp.json();
            if (data.error) throw new Error(data.error.message || 'OpenRouter API error');
            if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
                throw new Error('Malformed API response from OpenRouter');
            }
            return data.choices[0].message.content;
        }

        async function callAI(sys, usr) {
            if (provider === 'gemini') return callGemini(sys, usr);
            if (provider === 'openrouter') return callOpenRouter(sys, usr);
            throw new Error('No valid AI provider selected.');
        }

        // â”€â”€ GENERATE â”€â”€
        async function generate() {
            // [v4] refactored generate inputs, validation, and options parsing logic
            if (isGen) return;
            
            var savedKey = (provider === 'gemini') ? localStorage.getItem('re-key-gemini') : localStorage.getItem('re-key-openrouter');
            if (!savedKey) { openModal(); return; }

            var isS = mode === 'source';
            var isL = mode === 'latex';
            var isB = mode === 'build';

            // Get JD based on active mode
            var jd = (isL ? gv('jd-latex') : isS ? gv('jd-source') : gv('jd-build')).trim();

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
                alert('Please provide at least a Job Description, a Target Role, or an Industry.');
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
            wC = tv(isL ? 'tc-latex' : isS ? 'tc-source' : 'tc-build');
            var wD = isL && tv('td-latex');

            // Get selected template
            var activeLid = isL ? 'tl-latex' : isS ? 'tl-source' : 'tl-build';
            var activeTplEl = document.querySelector('#' + activeLid + ' .tpl-item.sel');
            if (activeTplEl) selTpl = activeTplEl.dataset.id;
            var hint = HINTS[selTpl] || HINTS['jake-classic'];

            // System prompt configured precisely as in brain.md (Prompt 1)
            var sys = `You are Resume Engineer, an expert ATS resume optimizer and career
assistant. Your job is to analyze a user's resume and generate a
fully optimized, compilable LaTeX resume tailored to the target role.

You will always respond with a single valid JSON object. No markdown,
no explanation outside the JSON, no preamble. Just raw JSON.

---

## INPUT YOU WILL RECEIVE

The user message will contain:
- resume_content: their raw resume (text, form data, or LaTeX)
- input_mode: "latex" | "form" | "upload"
- jd: job description text (may be empty string)
- target_role: e.g. "Data Analyst Intern" (may be empty string)
- industry: e.g. "FinTech" (may be empty string)
- template_id: one of [jake-classic, datta-custom, tlc-datasci,
  harshibar, anubhav]
- generate_cover_letter: true | false

---

## JD FALLBACK LOGIC

Follow this priority order strictly:
1. If jd is non-empty â†’ use it for keyword extraction and tailoring.
2. If jd is empty but target_role and industry are provided â†’ infer
   ATS expectations for that role and industry. Simulate what
   keywords Workday/Greenhouse ATS systems expect.
3. If all three are empty â†’ infer role, industry, and keywords
   entirely from the resume content itself. State your inference
   in the ats_report.role_inferred field.

---

## YOUR OUTPUT â€” JSON SCHEMA

Return exactly this structure:

{
  "latex": "<full compilable LaTeX string>",

  "html_preview": "<minimal HTML string for PDF-style preview>",

  "ats_report": {
    "overall_score": <integer 0-100>,
    "verdict": "PASS" | "BORDERLINE" | "FAIL",
    "pass_threshold": 70,
    "role_inferred": "<string â€” state inferred role if JD was blank>",
    "sub_scores": {
      "keyword_density": {
        "score": <integer 0-25>,
        "max": 25,
        "present_count": <integer>,
        "missing_count": <integer>,
        "note": "<one sentence explanation>"
      },
      "ats_formatting": {
        "score": <integer 0-25>,
        "max": 25,
        "issues_found": ["<issue1>", "<issue2>"],
        "note": "<one sentence explanation>"
      },
      "section_order": {
        "score": <integer 0-25>,
        "max": 25,
        "detected_order": ["<section1>", "<section2>", "..."],
        "optimal_order": ["<section1>", "<section2>", "..."],
        "note": "<one sentence explanation>"
      },
      "readability_bullets": {
        "score": <integer 0-25>,
        "max": 25,
        "action_verb_strength": <integer 0-10>,
        "quantification_rate": "<e.g. 4/8 bullets have metrics>",
        "note": "<one sentence explanation>"
      }
    },
    "keywords": {
      "present": ["<kw1>", "<kw2>"],
      "missing": ["<kw1>", "<kw2>"],
      "suggested": ["<kw1>", "<kw2>"]
    },
    "improvements": [
      {
        "priority": "HIGH" | "MEDIUM" | "LOW",
        "suggestion": "<specific actionable fix, not generic advice>"
      }
    ],
    "missing_sections": ["<section_name>"]
  },

  "cover_letter": "<~180 word cover letter string or empty string>",

  "checklist": {
    "ats_score_pass": <boolean>,
    "verdict_status": "PASS" | "BORDERLINE" | "FAIL",
    "formatting_safe": <boolean>,
    "missing_keywords_acceptable": <boolean>,
    "latex_generated": <boolean>,
    "suggested_keywords_present": <boolean>,
    "cover_letter_ready": <boolean>,
    "overall_ready": <boolean>
  },

  "diff": {
    "available": <boolean â€” true only if input_mode is "latex">,
    "lines": [
      {
        "type": "added" | "removed" | "unchanged",
        "content": "<line text>"
      }
    ]
  }
}

---

## LATEX GENERATION RULES

- Output must be 100% compilable on Overleaf with no errors.
- One page maximum. Never exceed one page.
- Use the template matching template_id. If unknown, default to
  jake-classic.
- Do not use tables, multi-column layouts, graphics, icons,
  or anything that breaks ATS parsers (Workday, Greenhouse, Lever).
- All bullet points must start with strong action verbs.
- Quantify at least 60% of experience bullets with numbers/metrics.
- Preserve all factual information from the original resume.
  Never fabricate experience, education, or credentials.
- You may rephrase, reorder, and strengthen bullets.
- Inject missing keywords naturally into bullets or skills section
  only if factually plausible.

---

## HTML PREVIEW RULES

- Generate a minimal HTML string that visually mimics a PDF resume.
- Include: name, contact line, section headers, entries, bullets.
- Use inline styles only. No external CSS. No scripts.
- Keep it under 3000 characters. This is a preview, not a full render.

---

## ATS SCORING RULES

- overall_score = sum of all 4 sub-scores (max 100).
- PASS: score >= 70
- BORDERLINE: score 50-69
- FAIL: score < 50
- keyword_density: score based on % of expected keywords present.
  Full 25 if >80% present, scale down proportionally.
- ats_formatting: start at 25, deduct 5 per formatting issue found.
- section_order: score based on how close detected order is to
  optimal for the role type (SWE, Data, Business, etc.).
- readability_bullets: score based on action verb strength (0-10)
  and quantification rate (0-15).

---

## IMPROVEMENTS RULES

- Produce exactly 5-8 improvements. Never fewer than 5.
- Label each HIGH / MEDIUM / LOW based on ATS impact.
- Be specific: name the section, bullet, or issue directly.
  Bad: "Add more metrics." 
  Good: "Quantify your SmartBridge internship â€” add the number of
  records processed and dashboard views."
- Do not repeat the same advice across items.

---

## COVER LETTER RULES

- Only generate if generate_cover_letter is true.
- Target length: ~180 words. Never exceed 220.
- If JD is provided: tailor to the JD's role, company tone,
  and top 3 required skills.
- If JD is empty: tailor to inferred role from resume.
- Format: 3 paragraphs â€” hook, proof, close.
- Do not use filler phrases like "I am excited to apply" or
  "I am a passionate professional."
- Write in first person, confident tone, specific to the candidate.

---

## DIFF RULES

- Only compute diff if input_mode is "latex".
- Compare original LaTeX lines to generated LaTeX lines.
- Tag each line as added, removed, or unchanged.
- If input_mode is not "latex", set diff.available to false
  and diff.lines to empty array.

---

## MISSING SECTION RECOVERY

- If any standard section is absent from the resume
  (Education, Skills, Experience, Projects, Certifications),
  add its name to ats_report.missing_sections array.
- Do not fabricate content for missing sections in the LaTeX output.
  Leave them as empty section headers with a comment:
  % MISSING â€” user must fill this section

---

## ABSOLUTE RULES

1. Never fabricate degrees, companies, projects, or credentials.
2. Never exceed one page in LaTeX output.
3. Always return valid JSON. No trailing commas. No comments in JSON.
4. Never include markdown code fences in your response.
5. If the resume content is empty or unreadable, return an error:
   { "error": "Resume content is empty or could not be parsed." }`;

            var userPayload = {
                resume_content: resume,
                input_mode: aiInputMode,
                jd: jd,
                target_role: activeRole,
                industry: activeInd,
                template_id: selTpl,
                template_hint: hint,
                generate_cover_letter: wC
            };

            var usr = JSON.stringify(userPayload, null, 2);

            isGen = true; R = {};
            var btn = document.getElementById('run-btn');
            btn.disabled = true;
            document.getElementById('run-ico').innerHTML = '<span class="spin"></span>';
            document.getElementById('run-lbl').textContent = 'Generatingâ€¦';
            var pr = document.getElementById('prog'); pr.style.width = '0%'; pr.classList.add('live');
            document.getElementById('err-banner').style.display = 'none';

            var ob = document.getElementById('out-body');
            ob.innerHTML = '<div class="loading-state"><div class="ls-pre">â€” AI is working</div><ul class="ls-steps">' +
                STEPS.map(function (s, i) { return '<li class="ls-step" id="st' + i + '"><span class="ls-step-n">0' + (i + 1) + '</span><span class="ls-step-t">' + s + '</span></li>'; }).join('') +
                '</ul></div>';
            document.getElementById('results-section').style.display = 'block';
            window.scrollTo({ top: document.getElementById('results-section').offsetTop - 80, behavior: 'smooth' });

            var si = 0; if (stepTmr) clearInterval(stepTmr);
            stepTmr = setInterval(function () {
                if (si > 0) { var prev = document.getElementById('st' + (si - 1)); if (prev) { prev.classList.remove('on'); prev.classList.add('done'); } }
                var cur = document.getElementById('st' + si); if (cur) cur.classList.add('on');
                si++; if (si >= STEPS.length) clearInterval(stepTmr);
            }, 2400);

            try {
                setTimeout(function () { pr.style.width = '30%'; }, 300);
                var raw = await callAI(sys, usr);
                pr.style.width = '90%';
                
                var clean = raw.replace(/```json|```/g, "").trim();
                var parsed;
                try {
                    parsed = JSON.parse(clean);
                } catch (_) {
                    var m = clean.match(/\{[\s\S]*\}/);
                    if (m) parsed = JSON.parse(m[0]);
                    else throw new Error('Could not parse AI response as JSON. The response may be truncated â€” please try again.');
                }
                
                R = parsed;
                pr.style.width = '100%';
                setTimeout(function () { pr.style.width = '0%'; pr.classList.remove('live'); }, 500);
            } catch (err) {
                R = {};
                pr.style.width = '0%'; pr.classList.remove('live');
                var eb = document.getElementById('err-banner');
                eb.innerHTML = '<strong>Error:</strong> ' + ex(err.message) + '. Check your API key and try again.';
                eb.style.display = 'block';
            }

            if (stepTmr) clearInterval(stepTmr);
            isGen = false;
            btn.disabled = false;
            document.getElementById('run-ico').textContent = 'âš¡';
            document.getElementById('run-lbl').textContent = 'Generate';
            
            if (R.ats_report) renderResults();
        }

        // â”€â”€ RENDER RESULTS â”€â”€
        function jumpLink(id, label) {
            return '<span class="jump-link" onclick="document.getElementById(\'' + id + '\').scrollIntoView({behavior:\'smooth\'})">' + label + '</span>';
        }

        function renderResults() {
            var d = R.ats_report || {};
            var ms = d.overall_score || 0;
            var verdict = d.verdict || 'FAIL';
            var offset = 314.16 - (ms / 100 * 314.16);
            var isL = mode === 'latex';

            var ringColorClass = 'lo';
            var verdictColor = 'var(--warn)';
            if (ms >= 70) {
                ringColorClass = 'hi';
                verdictColor = 'var(--accent-txt)';
            } else if (ms >= 50) {
                ringColorClass = 'mid';
                verdictColor = 'var(--amber-txt)';
            }

            // Missing section warnings
            var missingSectionsHtml = '';
            if (d.missing_sections && d.missing_sections.length > 0) {
                missingSectionsHtml = '<div class="miss-chip-container">' +
                    d.missing_sections.map(function(sec) {
                        var safeSec = sec.replace(/\s+/g, '-');
                        return '<div class="miss-chip" id="miss-card-' + safeSec + '">' +
                            '<span class="miss-label">âš ï¸ Missing Section: <strong>' + ex(sec) + '</strong></span>' +
                            '<div class="miss-actions">' +
                                '<button class="miss-btn ai-fill-btn" onclick="aiFillSection(\'' + sec.replace(/'/g, "\\'") + '\')">AI Fill</button>' +
                                '<button class="miss-btn scroll-btn" onclick="scrollToSection(\'' + sec.replace(/'/g, "\\'") + '\')">Fill Myself</button>' +
                                '<button class="miss-btn skip-btn" onclick="dismissMissChip(\'' + sec.replace(/'/g, "\\'") + '\')">Skip</button>' +
                            '</div>' +
                            '<div class="ai-fill-output" id="ai-fill-out-' + safeSec + '" style="display:none; margin-top:10px;">' +
                                '<textarea readonly class="modal-input" style="font-family:var(--mono); font-size:11px; height:100px; width:100%; resize:vertical;"></textarea>' +
                                '<button class="cpbtn" id="cpbtn-snip-' + safeSec + '" onclick="copySnippet(\'' + sec.replace(/'/g, "\\'") + '\')" style="margin-top: 6px;">Copy LaTeX Snippet</button>' +
                            '</div>' +
                        '</div>';
                    }).join('') +
                '</div>';
            }

            var jumps = [
                '<span class="jump-pre">Jump to:</span>',
                jumpLink('r-ats', 'ATS Report'),
                jumpLink('r-output', 'LaTeX &amp; Preview')
            ];
            if (isL && R.diff && R.diff.available && R.diff.lines && R.diff.lines.length) {
                jumps.push(jumpLink('r-diff', 'Diff'));
            }
            if (R.cover_letter) {
                jumps.push(jumpLink('r-cover', 'Cover Letter'));
            }
            jumps.push(jumpLink('r-check', 'Checklist'));
            var html = missingSectionsHtml + '<div class="jump-bar">' + jumps.join('') + '</div>';

            // SVG Donut Ring Chart HTML
            var donutHtml = '<div class="donut-chart-container">' +
                '<svg class="sc-ring ' + ringColorClass + '" viewBox="0 0 120 120" width="120" height="120">' +
                    '<circle class="ring-bg" cx="60" cy="60" r="50" fill="transparent" stroke="var(--hairline)" stroke-width="8" />' +
                    '<circle class="ring-fg" id="score-ring-fill" cx="60" cy="60" r="50" fill="transparent" stroke-width="8" ' +
                        'stroke-dasharray="314.16" stroke-dashoffset="314.16" stroke-linecap="round" transform="rotate(-90 60 60)" />' +
                '</svg>' +
                '<div class="donut-chart-text">' +
                    '<span class="donut-score">' + ms + '</span>' +
                    '<span class="donut-verdict" style="color:' + verdictColor + ';">' + verdict + '</span>' +
                '</div>' +
            '</div>';

            // Sub-Scores
            var subScores = d.sub_scores || {};
            var subScoresHtml = '<div class="sub-scores-grid">';
            var subList = [
                { key: 'keyword_density', label: 'Keyword Density' },
                { key: 'ats_formatting', label: 'ATS Formatting' },
                { key: 'section_order', label: 'Section Order' },
                { key: 'readability_bullets', label: 'Readability & Bullets' }
            ];
            subList.forEach(function(sub) {
                var subData = subScores[sub.key] || { score: 0, max: 25, note: '' };
                var scoreVal = subData.score || 0;
                var maxVal = subData.max || 25;
                var pct = (scoreVal / maxVal) * 100;
                var color = scoreVal >= maxVal * 0.8 ? 'var(--accent)' : scoreVal >= maxVal * 0.6 ? '#c8a000' : 'var(--warn)';
                
                subScoresHtml += '<div class="sub-sc-card">' +
                    '<div class="sub-sc-hdr">' +
                        '<span class="sub-sc-title">' + sub.label + '</span>' +
                        '<span class="sub-sc-val">' + scoreVal + '/' + maxVal + '</span>' +
                    '</div>' +
                    '<div class="sub-sc-bar"><div class="sub-sc-fill" style="width:' + pct + '%; background:' + color + ';"></div></div>' +
                    '<p class="sub-sc-note">' + ex(subData.note) + '</p>' +
                '</div>';
            });
            subScoresHtml += '</div>';

            var roleInferredText = d.role_inferred ? '<p class="atext" style="margin-top:-8px; margin-bottom:18px; text-align:center; font-style:italic;">Inferred Target Role: <strong>' + ex(d.role_inferred) + '</strong></p>' : '';

            // ATS Report card
            html += '<div class="rcard" id="r-ats"><div class="rcard-lbl">ATS Report</div>' +
                roleInferredText +
                donutHtml +
                subScoresHtml +
                '<div class="chip-section"><div class="chip-section-lbl">ðŸ”´ Missing Keywords (expecting, not in resume)</div><div class="chips">' +
                    ((d.keywords && d.keywords.missing && d.keywords.missing.length) ? d.keywords.missing.map(function(k) { return '<span class="chip chip-miss">' + ex(k) + '</span>'; }).join('') : '<span class="chip chip-neu">None</span>') +
                '</div></div>' +
                '<div class="chip-section"><div class="chip-section-lbl">ðŸŸ¢ Present Keywords (already matching)</div><div class="chips">' +
                    ((d.keywords && d.keywords.present && d.keywords.present.length) ? d.keywords.present.map(function(k) { return '<span class="chip chip-hit">' + ex(k) + '</span>'; }).join('') : '<span class="chip chip-neu">None</span>') +
                '</div></div>' +
                '<div class="chip-section"><div class="chip-section-lbl">ðŸ”µ Suggested Additions (role-inferred, click to copy)</div><div class="chips">' +
                    ((d.keywords && d.keywords.suggested && d.keywords.suggested.length) ? d.keywords.suggested.map(function(k) { return '<span class="chip chip-sug" onclick="copyChipText(\'' + k.replace(/'/g, "\\'") + '\', this)">' + ex(k) + '</span>'; }).join('') : '<span class="chip chip-neu">None</span>') +
                '</div></div>';

            // Actionable improvements
            if (d.improvements && d.improvements.length > 0) {
                html += '<div class="impr-panel">' +
                    '<div style="font-size:12px; font-weight:600; color:var(--ink); margin-bottom:10px; margin-top:16px;">Actionable Improvements</div>' +
                    '<div class="impr-list" style="display:flex; flex-direction:column; gap:8px;">' +
                        d.improvements.map(function(impr) {
                            var prio = (impr.priority || 'MEDIUM').toUpperCase();
                            var badgeClass = prio === 'HIGH' ? 'high' : prio === 'LOW' ? 'low' : 'med';
                            return '<div class="impr-item" style="display:flex; align-items:flex-start; gap:8px; font-size:12.5px; line-height:1.5;">' +
                                '<span class="impr-badge ' + badgeClass + '">' + prio + '</span>' +
                                '<span class="impr-txt">' + ex(impr.suggestion) + '</span>' +
                            '</div>';
                        }).join('') +
                    '</div>' +
                '</div>';
            }
            html += '</div>';

            // LaTeX + Preview (tabbed)
            html += '<div class="rcard" id="r-output"><div class="rcard-lbl">LaTeX Code &amp; Preview</div>' +
                '<div class="out-tabs">' +
                '<button class="otab on" id="ot-latex" onclick="switchOutTab(\'latex\')">LaTeX Source</button>' +
                '<button class="otab" id="ot-preview" onclick="switchOutTab(\'preview\')">HTML Preview</button>' +
                '</div>' +
                '<div class="out-pane show" id="op-latex">' +
                '<div class="code-meta">Template: <span>' + ex(selTpl) + '</span> &nbsp;Â·&nbsp; Copy â†’ Overleaf â†’ Compile â†’ Export PDF</div>' +
                '<div class="code-box">' + ex(R.latex || '') + '</div>' +
                '<div style="display:flex; gap:8px; margin-top:8px;">' +
                    '<button class="cpbtn" id="cpbtn-latex" onclick="cpTxt(R.latex,\'cpbtn-latex\')" style="flex:1; margin-top:0;">Copy full LaTeX code</button>' +
                    '<button class="cpbtn" id="open-overleaf-btn" onclick="openOverleaf()" style="flex:1; margin-top:0; background:var(--accent-bg); border-color:var(--accent); color:var(--accent-txt);">Open in Overleaf</button>' +
                '</div>' +
                '</div>' +
                '<div class="out-pane" id="op-preview">' +
                parsePDF(R.latex || '') +
                '<p style="margin-top:10px;font-size:11px;color:var(--muted);text-align:center">Approximate preview â€” compile on <a href="https://www.overleaf.com" target="_blank" style="color:var(--accent-txt)">Overleaf</a> for exact output.</p>' +
                '<button class="cpbtn" id="cpbtn-prev" onclick="cpTxt(R.latex,\'cpbtn-prev\')" style="margin-top:8px">Copy LaTeX to compile</button>' +
                '</div></div>';

            // Collapsible Diff (LaTeX mode only)
            if (isL && R.diff && R.diff.available && R.diff.lines && R.diff.lines.length) {
                html += '<div class="rcard" id="r-diff">' +
                    '<div class="acc-hd" onclick="toggleAcc(this)">' +
                        '<div class="acc-hd-l"><span class="acc-dot"></span><span class="acc-title">Diff â€” Changes vs Base</span></div>' +
                        '<span class="acc-chev open">â–¾</span>' +
                    '</div>' +
                    '<div class="acc-body show" style="padding:12px;">' +
                        '<div class="diff-box" style="font-family:var(--mono); font-size:11px; line-height:1.6; max-height:400px; overflow-y:auto; border-radius:3px; border:1px solid var(--hairline);">' +
                            R.diff.lines.map(function(line) {
                                var lineClass = 'dl-unchanged';
                                var prefix = '  ';
                                if (line.type === 'added') { lineClass = 'dl-added'; prefix = '+ '; }
                                else if (line.type === 'removed') { lineClass = 'dl-removed'; prefix = '- '; }
                                return '<div class="' + lineClass + '">' + prefix + ex(line.content) + '</div>';
                            }).join('') +
                        '</div>' +
                    '</div>' +
                '</div>';
            }

            // Cover Letter
            if (R.cover_letter) {
                html += '<div class="rcard" id="r-cover"><div class="rcard-lbl">Cover Letter</div>' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">' +
                        '<span class="cover-word-count" id="cover-wc" style="font-family:var(--mono); font-size:10px; color:var(--muted);">Word Count: 0</span>' +
                        '<button class="nav-btn" id="cover-edit-btn" onclick="toggleCoverEdit()" style="font-size:10px;">âœŽ Edit</button>' +
                    '</div>' +
                    '<div id="cover-box-view" class="cover-box">' + ex(R.cover_letter) + '</div>' +
                    '<textarea id="cover-box-edit" class="modal-input" style="display:none; font-family:var(--serif); font-size:14px; line-height:1.85; padding:18px 22px; background:var(--paper); height:300px; resize:vertical; width:100%; border:1px solid var(--hairline); border-radius:3px;">' + ex(R.cover_letter) + '</textarea>' +
                    '<div class="modal-warn" id="cover-warn" style="margin-top:8px; margin-bottom:8px; display:none;">âš ï¸ Word count exceeds 220 words. Consider making it more concise for maximum recruiter engagement.</div>' +
                    '<button class="cpbtn" id="cpbtn-cover" onclick="copyCover()" style="margin-top:8px;">Copy cover letter</button>' +
                    '</div>';
            }

            // Pre-Apply Checklist
            var checklist = R.checklist || {};
            var chkItems = [
                { t: 'ATS Score â‰¥ 70 (yours: ' + ms + ')', p: ms >= 70 },
                { t: 'Verdict Status: ' + verdict, p: verdict === 'PASS' },
                { t: 'Formatting Safe (no ATS-breaking elements)', p: checklist.formatting_safe !== false },
                { t: 'Missing Keywords < 3', p: (d.keywords && d.keywords.missing ? d.keywords.missing.length < 3 : true) },
                { t: 'LaTeX Generated', p: !!R.latex },
                { t: 'Suggested Keywords Reviewed', p: true },
                { t: 'Cover Letter Ready', p: R.cover_letter ? true : !wC }
            ];
            var allPass = chkItems.every(function (i) { return i.p; });

            html += '<div class="rcard" id="r-check"><div class="rcard-lbl">Pre-Apply Checklist</div>' +
                '<div class="chk-list">' + chkItems.map(function(i) {
                    return '<div class="ci ' + (i.p ? 'pass' : 'fail') + '">' +
                        '<span class="ci-ico">' + (i.p ? 'âœ“' : 'âœ—') + '</span>' +
                        '<span class="ci-txt">' + i.t + '</span>' +
                    '</div>';
                }).join('') + '</div>' +
                '<div class="verdict ' + (allPass ? 'ok' : 'wait') + '">' +
                (allPass ? 'Ready to apply! âœ… Copy the LaTeX, compile on Overleaf, export PDF, and submit.' :
                    'Not Ready âŒ â€” review the ATS Report and fix the remaining checklist items.') +
                '</div></div>';

            document.getElementById('out-body').innerHTML = html;

            // Animate SVG score-ring
            setTimeout(function() {
                var ring = document.getElementById('score-ring-fill');
                if (ring) ring.style.strokeDashoffset = offset;
            }, 100);

            if (R.cover_letter) updateCoverWc();
        }

        function switchOutTab(tab) {
            document.getElementById('ot-latex').classList.toggle('on', tab === 'latex');
            document.getElementById('ot-preview').classList.toggle('on', tab === 'preview');
            document.getElementById('op-latex').classList.toggle('show', tab === 'latex');
            document.getElementById('op-preview').classList.toggle('show', tab === 'preview');
        }

        // â”€â”€ COVER LETTER EDIT UTILS â”€â”€
        function toggleCoverEdit() {
            var view = document.getElementById('cover-box-view');
            var edit = document.getElementById('cover-box-edit');
            var btn = document.getElementById('cover-edit-btn');
            
            if (edit.style.display === 'none') {
                edit.value = view.textContent;
                view.style.display = 'none';
                edit.style.display = 'block';
                btn.textContent = 'âœ“ Done';
            } else {
                view.textContent = edit.value;
                R.cover_letter = edit.value;
                view.style.display = 'block';
                edit.style.display = 'none';
                btn.textContent = 'âœŽ Edit';
                updateCoverWc();
            }
        }

        function updateCoverWc() {
            var view = document.getElementById('cover-box-view');
            if (!view) return;
            var text = view.textContent;
            var wc = text.trim().split(/\s+/).filter(Boolean).length;
            document.getElementById('cover-wc').textContent = 'Word Count: ' + wc;
            var warn = document.getElementById('cover-warn');
            if (wc > 220) {
                warn.style.display = 'block';
            } else {
                warn.style.display = 'none';
            }
        }

        function copyCover() {
            var text = document.getElementById('cover-box-view').textContent;
            cpTxt(text, 'cpbtn-cover');
        }

        // â”€â”€ MISSING SECTIONS RECOVERY ACTIONS â”€â”€
        function dismissMissChip(sec) {
            var card = document.getElementById('miss-card-' + sec.replace(/\s+/g, '-'));
            if (card) {
                card.style.opacity = '0';
                card.style.transform = 'translateY(8px)';
                setTimeout(function() { card.remove(); }, 200);
            }
        }

        function scrollToSection(sec) {
            // [v4] scroll to specific form accordion card in build mode
            setMode('build');   // was form
            var secId = '';
            var s = sec.toLowerCase();
            if (s.includes('edu')) secId = 'edu-list';
            else if (s.includes('skill')) secId = 'f-langs';
            else if (s.includes('proj')) secId = 'proj-list';
            else if (s.includes('exp') || s.includes('work') || s.includes('intern')) secId = 'exp-list';
            else if (s.includes('cert')) secId = 'cert-list';
            else if (s.includes('ach')) secId = 'ach-list';
            
            if (secId) {
                var el = document.getElementById(secId);
                if (el) {
                    var acc = el.closest('.acc');
                    if (acc) {
                        var body = acc.querySelector('.acc-body');
                        var chev = acc.querySelector('.acc-chev');
                        if (body && !body.classList.contains('show')) {
                            body.classList.add('show');
                            if (chev) chev.classList.add('open');
                        }
                    }
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.focus();
                }
            }
        }

        async function aiFillSection(sec) {
            var safeSec = sec.replace(/\s+/g, '-');
            var btn = document.querySelector('#miss-card-' + safeSec + ' .ai-fill-btn');
            var outDiv = document.getElementById('ai-fill-out-' + safeSec);
            var textarea = outDiv.querySelector('textarea');
            
            btn.disabled = true;
            btn.textContent = 'Generatingâ€¦';
            
            var inferredRole = R.ats_report.role_inferred || 'Software Developer';
            
            var sys = 'You are an expert resume assistant. Generate a compilable LaTeX snippet for the requested section of a resume matching the template. ' +
                      'Respond with a single valid JSON object containing a "latex_snippet" field. No markdown fences, no formatting outside the JSON.';
                      
            var usr = 'Generate a plausible placeholder ' + sec + ' section for a ' + inferredRole + ' resume. ' +
                      'Keep it concise, professional, and ATS-safe. Target template: ' + selTpl + '. Return JSON with "latex_snippet" key.';
                      
            try {
                var raw = await callAI(sys, usr);
                var clean = raw.replace(/```json|```/g, "").trim();
                var data;
                try {
                    data = JSON.parse(clean);
                } catch (_) {
                    var match = clean.match(/\{[\s\S]*\}/);
                    if (match) data = JSON.parse(match[0]);
                    else throw new Error("Could not parse AI response.");
                }
                var snippet = data.latex_snippet || data.snippet || '';
                textarea.value = snippet;
                outDiv.style.display = 'block';
                btn.textContent = 'Regenerate';
                btn.disabled = false;
            } catch (err) {
                alert('AI Fill failed: ' + err.message);
                btn.textContent = 'AI Fill';
                btn.disabled = false;
            }
        }

        function copySnippet(sec) {
            var safeSec = sec.replace(/\s+/g, '-');
            var outDiv = document.getElementById('ai-fill-out-' + safeSec);
            var text = outDiv.querySelector('textarea').value;
            cpTxt(text, 'cpbtn-snip-' + safeSec);
        }

        // â”€â”€ PDF PREVIEW PARSER â”€â”€
        function parsePDF(latex) {
            if (!latex) return '<div style="padding:32px;text-align:center;color:var(--muted);font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;border:1px dashed var(--hairline);border-radius:3px">No LaTeX generated yet</div>';
            try {
                var nM = latex.match(/\\Large[^}]*\\textbf\{([^}]+)\}/) || latex.match(/\\textbf\{([A-Z][^}]{2,40})\}/);
                var name = nM ? nM[1] : 'Your Name';
                var eM = latex.match(/href\{mailto:[^}]+\}\{([^}]+)\}/);
                var email = eM ? eM[1] : '';
                var phM = latex.match(/faPhone[^{]*\{?([\+\d\s\-]{7,})/) || latex.match(/(\+?\d[\d\s\-]{6,})/);
                var phone = phM ? phM[1].trim() : '';
                var lM = latex.match(/linkedin\.com\/in\/([^\s}\\]+)/);
                var linkedin = lM ? 'linkedin.com/in/' + lM[1] : '';
                var gM = latex.match(/github\.com\/([^\s}\\]+)/);
                var github = gM ? 'github.com/' + gM[1] : '';
                var contact = [email, phone, linkedin, github].filter(Boolean).join(' | ');

                var secs = []; var sr = /\\section\*?\{([^}]+)\}([\s\S]*?)(?=\\section|\\end\{document\})/g; var sm;
                while ((sm = sr.exec(latex)) !== null) secs.push({ t: sm[1].replace(/\\[a-z]+/g, '').trim(), b: sm[2] });

                var h = '<div class="pdf-page"><div class="pdf-name">' + ex(name) + '</div><div class="pdf-contact">' + ex(contact) + '</div>';

                secs.forEach(function (sec) {
                    h += '<div class="pdf-sec">' + ex(sec.t) + '</div>';
                    var subs = [];
                    var subR = /\\resumeSubheading\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}\{([^}]*)\}/g; var sbm;
                    while ((sbm = subR.exec(sec.b)) !== null) subs.push({ o: sbm[1], d: sbm[2], r: sbm[3], l: sbm[4] });
                    var projR = /\\resumeProjectHeading\{([^}]+)\}\{([^}]*)\}/g; var pm;
                    while ((pm = projR.exec(sec.b)) !== null) {
                        var pn = pm[1].replace(/\\textbf\{([^}]+)\}/g, '$1').replace(/\\emph\{([^}]+)\}/g, '$1').replace(/\$\|?\$/g, 'Â·').replace(/\\[a-z]+/g, '').replace(/[{}]/g, '').trim();
                        subs.push({ o: pn, d: pm[2], r: '', l: '' });
                    }
                    var bullets = []; var bR = /\\resumeItem\{([^}]+)\}|\\item\s+([^\n]{4,})/g; var bm;
                    while ((bm = bR.exec(sec.b)) !== null) {
                        var bt = (bm[1] || bm[2] || '').replace(/\{[^}]*\}/g, '').replace(/\\[a-z]+\*?\s?/g, '').trim();
                        if (bt.length > 3) bullets.push(bt);
                    }
                    if (subs.length) {
                        subs.forEach(function (s, si) {
                            h += '<div class="pdf-entry"><div class="pdf-hd"><span>' + ex(s.o) + '</span><span>' + ex(s.d) + '</span></div>';
                            if (s.r || s.l) h += '<div class="pdf-sub"><span>' + ex(s.r) + '</span><span>' + ex(s.l) + '</span></div>';
                            var eb = bullets.slice(si * 3, si * 3 + 4);
                            if (eb.length) h += '<ul class="pdf-ul">' + eb.map(function (x) { return '<li>' + ex(x.slice(0, 130)) + '</li>'; }).join('') + '</ul>';
                            h += '</div>';
                        });
                    } else if (bullets.length) {
                        h += '<ul class="pdf-ul">' + bullets.slice(0, 8).map(function (x) { return '<li>' + ex(x.slice(0, 130)) + '</li>'; }).join('') + '</ul>';
                    } else {
                        var raw = sec.b.replace(/\\[a-zA-Z]+(\[[^\]]*\])?\{?/g, '').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
                        if (raw) h += '<p style="font-size:8.5px;color:#555;margin:0">' + ex(raw) + '</p>';
                    }
                });
                if (!secs.length) h += '<p style="font-size:9px;text-align:center;color:#888;padding:20px">Open in Overleaf for accurate rendering.</p>';
                return h + '</div>';
            } catch (e) {
                return '<div style="padding:24px;text-align:center;color:var(--muted);font-size:12px">LaTeX generated â€” open in Overleaf for accurate rendering.</div>';
            }
        }

        // â”€â”€ INIT â”€â”€
        // [v4] updated template initialization list and defaults
        initTpls();
        ['edu', 'proj', 'cert', 'ach'].forEach(function (t) { addEntry(t); });
        initDropzone();
        setMode('source'); // default mode on load is source
