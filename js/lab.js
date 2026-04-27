// js/lab.js

// Keep track of the current active audio/speech utterance to allow cancellation
let currentSpeech = null;

window.openLabModal = function(type, appInstance) {
    const modal = document.getElementById('labModal');
    const header = document.getElementById('labModalHeader');
    const title = document.getElementById('labModalTitle');
    const body = document.getElementById('labModalBody');
    const generateBtn = document.getElementById('generateLabBtn');
    const cancelBtn = document.getElementById('cancelLabBtn');
    const closeBtn = document.getElementById('closeLabModalBtn');

    modal.classList.remove('hidden');

    let configHtml = '';

    // Base configuration fields for all types
    const baseConfig = `
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">語言</label>
            <select id="labLang" class="w-full p-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none">
                <option value="zh-TW">繁體中文</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
            </select>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">自訂提示詞 (可選)</label>
            <textarea id="labPrompt" rows="2" class="w-full p-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none" placeholder="例如：請用小學生的語氣解釋..."></textarea>
        </div>
    `;

    // Type specific configs
    if (type === 'video') {
        title.innerHTML = '<i class="fas fa-film text-amber-500"></i> 影片解說設定';
        configHtml = baseConfig + `
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">時長/字數長度</label>
                <select id="labLength" class="w-full p-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none">
                    <option value="short">短 (約1分鐘)</option>
                    <option value="medium" selected>中 (約3分鐘)</option>
                    <option value="long">長 (約5分鐘)</option>
                </select>
            </div>
        `;
    } else if (type === 'podcast') {
        title.innerHTML = '<i class="fas fa-podcast text-blue-500"></i> 播客設定';
        configHtml = baseConfig + `
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">時長</label>
                <select id="labLength" class="w-full p-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none">
                    <option value="short">短 (約2分鐘)</option>
                    <option value="medium" selected>中 (約5分鐘)</option>
                </select>
            </div>
        `;
    } else if (type === 'mindmap') {
        title.innerHTML = '<i class="fas fa-project-diagram text-emerald-500"></i> 心智圖設定';
        configHtml = baseConfig + `
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">詳細程度</label>
                <select id="labDetail" class="w-full p-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none">
                    <option value="simple">簡單大綱</option>
                    <option value="detailed" selected>詳細分支</option>
                </select>
            </div>
        `;
    } else if (type === 'presentation') {
        title.innerHTML = '<i class="fas fa-desktop text-purple-500"></i> 簡報設定';
        configHtml = baseConfig + `
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">頁面數量</label>
                <input type="number" id="labPages" min="3" max="20" value="5" class="w-full p-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none">
            </div>
        `;
    } else if (type === 'quiz') {
        title.innerHTML = '<i class="fas fa-question-circle text-rose-500"></i> 測驗設定';
        configHtml = baseConfig + `
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">題目數量</label>
                <input type="number" id="labQuestions" min="1" max="20" value="5" class="w-full p-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none">
            </div>
        `;
    }

    body.innerHTML = configHtml;

    // Reset handlers to prevent duplicates
    const newGenerateBtn = generateBtn.cloneNode(true);
    generateBtn.parentNode.replaceChild(newGenerateBtn, generateBtn);
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

    const closeModal = () => modal.classList.add('hidden');
    newCancelBtn.onclick = closeModal;
    newCloseBtn.onclick = closeModal;

    newGenerateBtn.onclick = async () => {
        closeModal();
        appInstance.showLoading(`正在產生${type === 'video' ? '影片解說' : type === 'podcast' ? '播客' : type === 'mindmap' ? '心智圖' : type === 'presentation' ? '簡報' : '測驗'}...`);

        try {
            await handleLabGeneration(type, appInstance);
        } catch (error) {
            console.error("Lab Generation Error:", error);
            alert("產生失敗: " + error.message);
        } finally {
            appInstance.hideLoading();
        }
    };
};

async function handleLabGeneration(type, app) {
    const lang = document.getElementById('labLang').value;
    const prompt = document.getElementById('labPrompt').value;

    // Gather source contexts
    const activeSourcesData = app.sources.filter(s => app.activeSourceIds.includes(s.id));
    let contextText = "【來源資料】\n";
    activeSourcesData.forEach(s => {
        contextText += `--- 檔案：${s.name} ---\n${s.summary}\n\n`;
    });

    let systemInstruction = "";
    let userPrompt = contextText + "\n\n";

    if (type === 'video') {
        const length = document.getElementById('labLength').value;
        systemInstruction = "你是一個專業的影片腳本編輯與前端開發者。請根據提供的來源資料，產生一個可以用來當作「影片解說」的 HTML 結構，以及對應的「旁白文字」。";
        userPrompt += `
            語言: ${lang}
            長度: ${length}
            自訂要求: ${prompt}

            請嚴格輸出一個 JSON 格式，包含兩個陣列：
            1. 'slides': 每個物件包含 'html' (該畫面的 HTML 設計，請使用 Tailwind CSS class，確保畫面美觀圓滑，背景要有淺淺好看的顏色) 和 'narration' (該畫面要唸出來的旁白文字)。
            注意：HTML 應該是可以直接放在一個 container 裡的內容，不需要 <html> 或 <body> 標籤。

            格式範例:
            {
              "slides": [
                {
                  "html": "<div class='bg-blue-50 p-8 rounded-3xl text-center'><h1 class='text-4xl font-bold text-blue-800'>標題</h1></div>",
                  "narration": "大家好，今天我們要來解說這個主題..."
                }
              ]
            }
            只輸出 JSON，不要包含其他 markdown 標記。
        `;

        const response = await generateCompletion(app.settings.provider, app.settings.apiKey, app.settings.model, [{role: 'user', content: userPrompt}], systemInstruction);
        const data = parseJsonSafely(response);
        renderVideoExplanation(data);

    } else if (type === 'podcast') {
        const length = document.getElementById('labLength').value;
        systemInstruction = "你是一個專業的 Podcast 製作人。請根據來源資料，編寫一段兩人的對話腳本（主持人 Host 與來賓 Guest）。";
        userPrompt += `
            語言: ${lang}
            長度: ${length}
            自訂要求: ${prompt}

            請輸出一個 JSON 陣列，每個物件代表一句台詞，包含 'speaker' ('host' 或 'guest') 和 'text' (要唸的文字)。

            格式範例:
            [
              {"speaker": "host", "text": "歡迎收聽今天的節目！"},
              {"speaker": "guest", "text": "大家好，很高興來到這裡。"}
            ]
            只輸出 JSON。
        `;

        const response = await generateCompletion(app.settings.provider, app.settings.apiKey, app.settings.model, [{role: 'user', content: userPrompt}], systemInstruction);
        const data = parseJsonSafely(response);
        renderPodcast(data);

    } else if (type === 'mindmap') {
        const detail = document.getElementById('labDetail').value;
        systemInstruction = "你是一個整理大師。請將來源資料轉換為 Mermaid.js 的 mindmap 語法。";
        userPrompt += `
            語言: ${lang}
            詳細程度: ${detail === 'detailed' ? '詳細，包含多個層級與分支' : '簡單，只需主要概念'}
            自訂要求: ${prompt}

            請嚴格輸出 Mermaid 的 mindmap 語法，不要使用任何 markdown code block (不要有 \`\`\`mermaid)。
            語法開頭必須是 mindmap。
            請確保語法正確，避免特殊字元破壞解析。
        `;

        const response = await generateCompletion(app.settings.provider, app.settings.apiKey, app.settings.model, [{role: 'user', content: userPrompt}], systemInstruction);
        const cleanMermaid = response.replace(/```mermaid/gi, '').replace(/```/g, '').trim();
        renderMindmap(cleanMermaid);

    } else if (type === 'presentation') {
        const pages = document.getElementById('labPages').value;
        systemInstruction = "你是一個專業的簡報設計師。請根據來源資料，製作一份簡報。";
        userPrompt += `
            語言: ${lang}
            頁面數量: 約 ${pages} 頁
            自訂要求: ${prompt}

            請輸出一個 JSON 陣列，每個物件代表一頁簡報，包含 'html' 欄位。
            'html' 的內容應該是使用 Tailwind CSS 設計的精美簡報單頁。
            風格需保持一致，背景淺色柔和，圓角設計。適當地在適合的地方加入一些 FontAwesome 圖標 (<i class="fas fa-..."></i>) 作為插圖點綴。
            不需包含 <html> <body> 標籤，只需一個滿版的 div 作為容器。

            格式範例:
            [
              {"html": "<div class='flex flex-col items-center justify-center h-full bg-indigo-50'><i class='fas fa-rocket text-6xl text-indigo-500 mb-4'></i><h1 class='text-5xl font-bold text-gray-800'>標題</h1></div>"}
            ]
        `;

        const response = await generateCompletion(app.settings.provider, app.settings.apiKey, app.settings.model, [{role: 'user', content: userPrompt}], systemInstruction);
        const data = parseJsonSafely(response);
        renderPresentation(data);

    } else if (type === 'quiz') {
        const qCount = document.getElementById('labQuestions').value;
        systemInstruction = "你是一個出題老師。請根據來源資料出題。";
        userPrompt += `
            語言: ${lang}
            題目數量: ${qCount} 題
            自訂要求: ${prompt}

            請輸出一個 JSON 陣列，產生單選題。
            格式要求:
            [
              {
                "question": "題目內容？",
                "options": ["選項A", "選項B", "選項C", "選項D"],
                "answerIndex": 0, // 正確選項的索引 (0-3)
                "explanation": "因為..."
              }
            ]
        `;

        const response = await generateCompletion(app.settings.provider, app.settings.apiKey, app.settings.model, [{role: 'user', content: userPrompt}], systemInstruction);
        const data = parseJsonSafely(response);
        renderQuiz(data);
    }
}

function parseJsonSafely(text) {
    try {
        // Remove markdown code blocks if present
        let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("JSON parse error on string:", text);
        throw new Error("AI 回傳的格式不正確，無法解析。");
    }
}

// --- Player & TTS Utilities ---

function stopTTS() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
}

function speakText(text, lang = 'zh-TW', voiceType = 'default') {
    return new Promise((resolve) => {
        if (!window.speechSynthesis) {
            console.warn("Browser does not support TTS");
            resolve();
            return;
        }

        stopTTS();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;

        // Simple voice differentiation hack
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            let selectedVoice;
            const langVoices = voices.filter(v => v.lang.includes(lang.split('-')[0]));

            if (langVoices.length > 1) {
                if (voiceType === 'guest') {
                    // Try to pick a different voice for guest
                    selectedVoice = langVoices[1];
                } else {
                    selectedVoice = langVoices[0];
                }
            } else {
                selectedVoice = langVoices[0] || voices[0];
            }
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
        }

        utterance.onend = () => resolve();
        utterance.onerror = (e) => {
            console.error("TTS Error", e);
            resolve();
        };

        window.speechSynthesis.speak(utterance);
    });
}

// Ensure voices are loaded
if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
    };
}


// --- Rendering Functions ---

function openResultOverlay(title) {
    stopTTS(); // Stop any ongoing speech
    document.getElementById('labResultTitle').textContent = title;
    document.getElementById('labResultOverlay').classList.remove('hidden');

    document.getElementById('closeLabResultBtn').onclick = () => {
        stopTTS();
        document.getElementById('labResultOverlay').classList.add('hidden');
        document.getElementById('labResultContent').innerHTML = '';
    };
}

function renderVideoExplanation(data) {
    openResultOverlay('影片解說');
    const container = document.getElementById('labResultContent');

    container.innerHTML = `
        <div class="max-w-4xl mx-auto flex flex-col h-full items-center justify-center">
            <div id="videoDisplay" class="w-full aspect-video bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-200 transition-all duration-500 flex items-center justify-center p-8 relative">
                <div class="text-center text-gray-400">
                    <i class="fas fa-play-circle text-6xl mb-4 hover:text-indigo-500 cursor-pointer transition-colors" id="startVideoBtn"></i>
                    <p>點擊開始播放</p>
                </div>
            </div>
            <div class="mt-8 text-center" id="subtitleContainer">
                <p class="text-xl font-medium text-gray-700 bg-white/80 px-6 py-3 rounded-2xl shadow-sm inline-block min-h-[3rem]"></p>
            </div>
        </div>
    `;

    const display = document.getElementById('videoDisplay');
    const subtitle = container.querySelector('#subtitleContainer p');
    const startBtn = document.getElementById('startVideoBtn');

    if (startBtn) {
        startBtn.onclick = async () => {
            if (!data || !data.slides || data.slides.length === 0) return;

            for (let i = 0; i < data.slides.length; i++) {
                const slide = data.slides[i];

                // Fade out/in effect
                display.style.opacity = '0';
                await new Promise(r => setTimeout(r, 300));

                display.innerHTML = slide.html;
                subtitle.textContent = slide.narration;

                display.style.opacity = '1';

                await speakText(slide.narration);
                await new Promise(r => setTimeout(r, 500)); // Pause between slides
            }

            subtitle.textContent = "播放完畢";
        };
    }
}

function renderPodcast(data) {
    openResultOverlay('播客');
    const container = document.getElementById('labResultContent');

    container.innerHTML = `
        <div class="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 flex flex-col h-[80vh]">
            <div class="p-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
                <div class="flex items-center gap-4">
                    <div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <i class="fas fa-podcast text-3xl"></i>
                    </div>
                    <div>
                        <h2 class="text-2xl font-bold">AI 播客</h2>
                        <p class="text-blue-100 text-sm">基於您的筆記本生成</p>
                    </div>
                </div>
                <button id="startPodcastBtn" class="w-14 h-14 bg-white text-blue-600 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg">
                    <i class="fas fa-play text-xl ml-1"></i>
                </button>
            </div>

            <div class="flex-1 overflow-y-auto p-6 space-y-4" id="podcastTranscript">
                <!-- Transcript injected here -->
            </div>
        </div>
    `;

    const transcriptDiv = document.getElementById('podcastTranscript');

    // Render lines statically first
    data.forEach((line, index) => {
        const isHost = line.speaker === 'host';
        const el = document.createElement('div');
        el.className = `flex w-full ${isHost ? 'justify-start' : 'justify-end'} opacity-50 transition-opacity duration-300`;
        el.id = `podcast-line-${index}`;

        el.innerHTML = `
            <div class="max-w-[80%] flex ${isHost ? 'flex-row' : 'flex-row-reverse'} gap-3 items-end">
                <div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs text-white ${isHost ? 'bg-blue-500' : 'bg-indigo-500'}">
                    <i class="fas ${isHost ? 'fa-microphone' : 'fa-user'}"></i>
                </div>
                <div class="p-4 rounded-2xl ${isHost ? 'bg-gray-100 text-gray-800 rounded-bl-sm' : 'bg-indigo-50 text-indigo-900 border border-indigo-100 rounded-br-sm'}">
                    <div class="text-xs font-bold mb-1 opacity-50">${isHost ? '主持人' : '來賓'}</div>
                    <p>${line.text}</p>
                </div>
            </div>
        `;
        transcriptDiv.appendChild(el);
    });

    const startBtn = document.getElementById('startPodcastBtn');
    let isPlaying = false;

    startBtn.onclick = async () => {
        if (isPlaying) {
            stopTTS();
            isPlaying = false;
            startBtn.innerHTML = '<i class="fas fa-play text-xl ml-1"></i>';
            return;
        }

        isPlaying = true;
        startBtn.innerHTML = '<i class="fas fa-stop text-xl"></i>';

        for (let i = 0; i < data.length; i++) {
            if (!isPlaying) break; // Check if stopped

            const line = data[i];
            const lineEl = document.getElementById(`podcast-line-${i}`);

            // Highlight current line
            document.querySelectorAll('#podcastTranscript > div').forEach(el => el.classList.remove('opacity-100', 'scale-105'));
            document.querySelectorAll('#podcastTranscript > div').forEach(el => el.classList.add('opacity-50'));

            lineEl.classList.remove('opacity-50');
            lineEl.classList.add('opacity-100');
            lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

            await speakText(line.text, 'zh-TW', line.speaker);
        }

        isPlaying = false;
        startBtn.innerHTML = '<i class="fas fa-play text-xl ml-1"></i>';
    };
}

async function renderMindmap(mermaidSyntax) {
    openResultOverlay('心智圖');
    const container = document.getElementById('labResultContent');

    container.innerHTML = `
        <div class="w-full h-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 overflow-auto flex items-center justify-center">
            <div class="mermaid w-full max-w-5xl" id="mermaidContainer">
                ${mermaidSyntax}
            </div>
        </div>
    `;

    try {
        mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { primaryColor: '#eef2ff', primaryTextColor: '#3730a3', primaryBorderColor: '#818cf8', lineColor: '#c7d2fe' } });
        await mermaid.run({
            nodes: [document.getElementById('mermaidContainer')]
        });
    } catch (e) {
        console.error("Mermaid Render Error", e);
        container.innerHTML = `<div class="text-red-500 p-8">無法渲染心智圖: 格式錯誤。請稍後重試或修改來源。</div>`;
    }
}

function renderPresentation(data) {
    openResultOverlay('簡報');
    const container = document.getElementById('labResultContent');

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="text-red-500 p-8">無效的簡報資料</div>`;
        return;
    }

    let currentIndex = 0;

    const renderSlide = () => {
        container.innerHTML = `
            <div class="max-w-5xl mx-auto flex flex-col h-full">
                <div class="flex justify-between items-center mb-4">
                    <span class="bg-indigo-100 text-indigo-800 text-sm font-medium px-4 py-1.5 rounded-full shadow-sm">
                        Slide ${currentIndex + 1} / ${data.length}
                    </span>
                    <div class="flex gap-2">
                        <button id="prevSlide" class="px-5 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50" ${currentIndex === 0 ? 'disabled' : ''}>
                            <i class="fas fa-chevron-left"></i> 上一頁
                        </button>
                        <button id="nextSlide" class="px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50" ${currentIndex === data.length - 1 ? 'disabled' : ''}>
                            下一頁 <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
                <div class="flex-1 bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-200">
                    ${data[currentIndex].html}
                </div>
            </div>
        `;

        const prevBtn = document.getElementById('prevSlide');
        const nextBtn = document.getElementById('nextSlide');
        if (prevBtn) prevBtn.onclick = () => { currentIndex--; renderSlide(); };
        if (nextBtn) nextBtn.onclick = () => { currentIndex++; renderSlide(); };
    };

    renderSlide();
}

function renderQuiz(data) {
    openResultOverlay('測驗');
    const container = document.getElementById('labResultContent');

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="text-red-500 p-8">無效的測驗資料</div>`;
        return;
    }

    let html = '<div class="max-w-3xl mx-auto space-y-8 pb-12">';

    data.forEach((q, idx) => {
        html += `
            <div class="bg-white p-8 rounded-3xl shadow-md border border-gray-100 quiz-card">
                <h3 class="text-xl font-bold text-gray-800 mb-6 flex gap-3">
                    <span class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 text-sm shadow-inner">${idx + 1}</span>
                    <span>${q.question}</span>
                </h3>
                <div class="space-y-3 pl-11">
        `;

        q.options.forEach((opt, optIdx) => {
            const id = `q-${idx}-opt-${optIdx}`;
            html += `
                <label class="flex items-center p-4 rounded-xl border-2 border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors relative option-label">
                    <input type="radio" name="q-${idx}" value="${optIdx}" class="w-5 h-5 text-indigo-600 focus:ring-indigo-500">
                    <span class="ml-3 text-gray-700">${opt}</span>
                    <i class="fas fa-check text-emerald-500 absolute right-4 opacity-0 answer-icon-correct text-xl"></i>
                    <i class="fas fa-times text-rose-500 absolute right-4 opacity-0 answer-icon-wrong text-xl"></i>
                </label>
            `;
        });

        html += `
                </div>
                <div class="mt-6 pl-11 hidden explanation">
                    <div class="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-xl text-amber-800 text-sm">
                        <strong>解析：</strong>${q.explanation}
                    </div>
                </div>
            </div>
        `;
    });

    html += `
        <div class="text-center mt-10">
            <button id="submitQuizBtn" class="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 transform hover:-translate-y-1">
                提交答案
            </button>
        </div>
    </div>`;

    container.innerHTML = html;

    document.getElementById('submitQuizBtn').onclick = () => {
        let score = 0;

        data.forEach((q, idx) => {
            const selected = document.querySelector(`input[name="q-${idx}"]:checked`);
            const card = document.querySelectorAll('.quiz-card')[idx];
            const labels = card.querySelectorAll('.option-label');
            const expl = card.querySelector('.explanation');

            // Disable all inputs
            card.querySelectorAll('input').forEach(i => i.disabled = true);
            expl.classList.remove('hidden');

            const correctIdx = q.answerIndex;
            labels[correctIdx].classList.add('border-emerald-500', 'bg-emerald-50');
            labels[correctIdx].querySelector('.answer-icon-correct').classList.remove('opacity-0');

            if (selected) {
                const selectedIdx = parseInt(selected.value);
                if (selectedIdx === correctIdx) {
                    score++;
                } else {
                    labels[selectedIdx].classList.add('border-rose-500', 'bg-rose-50');
                    labels[selectedIdx].querySelector('.answer-icon-wrong').classList.remove('opacity-0');
                }
            }
        });

        const btn = document.getElementById('submitQuizBtn');
        btn.textContent = `得分: ${score} / ${data.length}`;
        btn.classList.replace('bg-indigo-600', 'bg-emerald-500');
        btn.classList.replace('hover:bg-indigo-700', 'hover:bg-emerald-600');
        btn.classList.replace('shadow-indigo-600/30', 'shadow-emerald-500/30');
        btn.disabled = true;
    };
}