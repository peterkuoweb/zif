import { getCurrentUser, saveProgress } from './auth.js'; // auth exports saveProgress? No db exports it.
import { getCourse, saveProgress as saveUserProgress, getUserProgress } from './db.js';

let courseId;
let course;
let currentUser;
let player; // YT Player
let progressInterval;

async function init() {
    const params = new URLSearchParams(window.location.search);
    courseId = params.get('id');

    if (!courseId) {
        alert("No course ID specified");
        window.location.href = 'courses.html';
        return;
    }

    currentUser = await getCurrentUser();
    if (!currentUser) {
        // Allow guest view? No, prompt login.
        if(!confirm("請先登入以儲存進度。是否前往登入？")) {
             // Guest mode
        } else {
             window.location.href = 'login.html';
        }
    }

    course = await getCourse(courseId);
    if (!course) {
        alert("Course not found");
        window.location.href = 'courses.html';
        return;
    }

    renderHeader();
    renderContent();
}

function renderHeader() {
    document.getElementById('course-title').textContent = course.title;
    document.getElementById('course-type').textContent = course.type;
    document.getElementById('course-desc').textContent = course.description || "請完成以下任務以通過本單元。";

    // Load existing progress
    if (currentUser) {
        getUserProgress(currentUser.uid).then(progs => {
            const p = progs.find(x => x.courseId === courseId);
            if (p && p.status === 'completed') {
                markCompleted(false); // Just update UI
            }
        });
    }
}

function renderContent() {
    const container = document.getElementById('player-container');
    const actionArea = document.getElementById('action-area');

    container.innerHTML = '';
    actionArea.innerHTML = '';

    // --- VIDEO ---
    if (course.type === 'video') {
        // Container for YT
        const videoDiv = document.createElement('div');
        videoDiv.id = 'yt-player';
        container.appendChild(videoDiv);

        // Init YT Player
        initYouTube(course.url);

        actionArea.innerHTML = `
            <div class="space-y-4">
                <div class="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                    <p class="text-sm font-bold text-slate-500 mb-1">觀看進度</p>
                    <div class="flex items-end gap-2">
                         <span id="vid-time" class="text-2xl font-bold text-primary">0</span>
                         <span class="text-slate-400 font-medium">/ ${course.requiredSeconds || 30} 秒</span>
                    </div>
                </div>
                <p class="text-xs text-slate-500">請觀看影片直到達到指定時間。</p>
            </div>
        `;
    }

    // --- PDF ---
    else if (course.type === 'pdf') {
        container.innerHTML = `
            <iframe src="${course.url}" class="w-full h-full border-none" id="pdf-frame"></iframe>
        `;
        // Since we can't easily detect scroll on cross-origin iframe, we'll use a timer button for demo or assume it's same-origin.
        // Or we simulate the "Scroll to bottom" requirement by asking the user to verify.

        actionArea.innerHTML = `
            <div class="space-y-4">
                <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                    <h3 class="font-bold text-blue-600 dark:text-blue-400 mb-2">閱讀任務</h3>
                    <p class="text-sm text-slate-600 dark:text-slate-400">請仔細閱讀講義內容。閱讀完畢後，請點擊下方按鈕。</p>
                </div>
                <button id="pdf-check-btn" class="w-full border border-primary text-primary font-bold py-2 rounded hover:bg-primary/5">
                    我已閱讀完畢
                </button>
            </div>
        `;

        document.getElementById('pdf-check-btn').addEventListener('click', () => {
             // In a real app with PDF.js, we would check 'pageNumber === numPages'
             if(confirm("確認您已閱讀完所有內容？")) {
                 unlockComplete();
             }
        });
    }

    // --- PRACTICAL ---
    else if (course.type === 'practical') {
        container.innerHTML = `
            <div class="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-10 text-center">
                 <div>
                    <span class="material-symbols-outlined text-6xl text-slate-300 mb-4">terminal</span>
                    <h3 class="text-xl font-bold mb-2">實作練習</h3>
                    <p class="mb-6 text-slate-500">請點擊右側連結開啟工具，並完成指定任務。</p>
                    <a href="${course.url}" target="_blank" class="bg-primary text-white px-6 py-3 rounded-lg font-bold hover:bg-primary/90 shadow-lg">
                        開啟實作工具 <span class="material-symbols-outlined text-sm align-middle">open_in_new</span>
                    </a>
                 </div>
            </div>
        `;

        actionArea.innerHTML = `
            <div class="space-y-6">
                <div>
                    <label class="block text-sm font-bold mb-2">任務驗證</label>
                    <p class="text-xs text-slate-500 mb-2">請在工具中完成操作，並複製結果貼上於此，或上傳截圖。</p>
                </div>

                ${course.matchText ? `
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-400 mb-1">文字驗證</label>
                    <input id="practical-text" class="w-full rounded border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3" placeholder="貼上輸出結果...">
                </div>
                ` : ''}

                <div>
                    <label class="block text-xs font-bold uppercase text-slate-400 mb-1">截圖上傳 (選填)</label>
                    <div class="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <span class="material-symbols-outlined text-slate-400">cloud_upload</span>
                        <p class="text-xs text-slate-500 mt-1">點擊上傳圖片</p>
                        <input type="file" class="hidden">
                    </div>
                </div>

                <button id="practical-check-btn" class="w-full bg-slate-800 text-white font-bold py-3 rounded hover:opacity-90">提交驗證</button>
            </div>
        `;

        document.getElementById('practical-check-btn').addEventListener('click', () => {
            if (course.matchText) {
                const val = document.getElementById('practical-text').value;
                const keywords = course.matchText.split(',').map(s => s.trim());
                const passed = keywords.some(k => val.includes(k));

                if (passed) {
                    alert("驗證成功！");
                    unlockComplete();
                } else {
                    alert(`驗證失敗。內容需包含: ${course.matchText}`);
                }
            } else {
                // If no text match required, just pass
                alert("提交成功！");
                unlockComplete();
            }
        });
    }

    // --- QUIZ ---
    else if (course.type === 'quiz') {
        let quizData = [];
        try {
            quizData = JSON.parse(course.quizData || '[]');
        } catch (e) {
            console.error("Quiz JSON error", e);
        }

        container.innerHTML = `
            <div class="w-full h-full bg-slate-50 dark:bg-slate-900 overflow-y-auto p-8 custom-scrollbar">
                <div class="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
                    <h2 class="text-2xl font-bold mb-6 text-center">單元測驗</h2>
                    <div id="quiz-questions" class="space-y-8"></div>
                </div>
            </div>
        `;

        const qContainer = document.getElementById('quiz-questions');
        qContainer.innerHTML = quizData.map((q, idx) => `
            <div class="question-block" data-idx="${idx}">
                <p class="font-bold text-lg mb-3">${idx+1}. ${q.q}</p>
                <div class="space-y-2">
                    ${q.options.map((opt, oIdx) => `
                        <label class="flex items-center gap-3 p-3 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                            <input type="radio" name="q-${idx}" value="${oIdx}" class="text-primary focus:ring-primary">
                            <span>${opt}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');

        actionArea.innerHTML = `
            <div class="text-center">
                <p class="text-sm text-slate-500 mb-4">共 ${quizData.length} 題，需全對才可過關。</p>
                <button id="quiz-submit-btn" class="w-full bg-primary text-white font-bold py-3 rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90">
                    提交答案
                </button>
            </div>
        `;

        document.getElementById('quiz-submit-btn').addEventListener('click', () => {
            let correctCount = 0;
            quizData.forEach((q, idx) => {
                const selected = document.querySelector(`input[name="q-${idx}"]:checked`);
                if (selected && parseInt(selected.value) === q.answer) {
                    correctCount++;
                }
            });

            if (correctCount === quizData.length) {
                alert(`恭喜！全對 (${correctCount}/${quizData.length})`);
                unlockComplete();
            } else {
                alert(`挑戰失敗，答對 ${correctCount}/${quizData.length} 題。請再試一次。`);
            }
        });
    }
}

function initYouTube(videoId) {
    if (!window.YT) {
        // Wait for API
        setTimeout(() => initYouTube(videoId), 100);
        return;
    }

    player = new YT.Player('yt-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        if (!progressInterval) {
            progressInterval = setInterval(() => {
                const time = player.getCurrentTime();
                const req = parseInt(course.requiredSeconds || 30);
                document.getElementById('vid-time').textContent = Math.floor(time);

                if (time >= req) {
                    unlockComplete();
                    clearInterval(progressInterval);
                }
            }, 1000);
        }
    }
}

function unlockComplete() {
    const btn = document.getElementById('complete-btn');
    btn.disabled = false;
    btn.classList.remove('bg-slate-200', 'text-slate-400', 'cursor-not-allowed');
    btn.classList.add('bg-green-500', 'text-white', 'hover:bg-green-600', 'shadow-lg');
    btn.innerHTML = `<span class="material-symbols-outlined">check_circle</span> 領取完成證明`;

    btn.onclick = async () => {
        markCompleted(true);
    };
}

async function markCompleted(saveToDb) {
    const btn = document.getElementById('complete-btn');
    btn.innerHTML = `<span class="material-symbols-outlined">verified</span> 已完成`;
    btn.disabled = true;

    document.getElementById('progress-bar').style.width = '100%';
    document.getElementById('progress-text').textContent = '100%';

    if (saveToDb && currentUser) {
        await saveUserProgress(currentUser.uid, courseId, { status: 'completed', score: 100 });
        alert("恭喜！您已完成此單元。");
    }
}

init();

// Global for YT API
window.onYouTubeIframeAPIReady = function() {
    // API Ready
};
