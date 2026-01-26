import { getCurrentUser, logoutUser } from './auth.js';
import { getCourses, saveCourse, createClass, getClassesForTeacher, getAllUsers, deleteCourse as deleteCourseDb } from './db.js';

let currentUser;

async function init() {
    currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'teacher')) {
        return window.location.href = 'login.html';
    }

    // Update Sidebar User Info
    document.getElementById('user-name').textContent = currentUser.name || currentUser.email;
    document.getElementById('user-role').textContent = currentUser.role === 'admin' ? '管理員' : '教師';
    document.getElementById('user-avatar').textContent = (currentUser.name || currentUser.email)[0].toUpperCase();

    // Event Listeners
    document.getElementById('logout-btn').addEventListener('click', logoutUser);

    document.addEventListener('switch-tab', (e) => loadTab(e.detail));
    document.addEventListener('open-course-modal', () => showCourseModal());
    document.addEventListener('open-class-modal', () => showClassModal());

    // Initial Tab
    loadTab('users');
}

async function loadTab(tabName) {
    const content = document.getElementById('content-area');
    const title = document.getElementById('page-title');

    // Reset Active State
    document.querySelectorAll('aside nav button').forEach(b => b.classList.remove('bg-primary/10', 'text-primary'));
    document.getElementById(`nav-${tabName}`).classList.add('bg-primary/10', 'text-primary');

    if (tabName === 'users') {
        title.textContent = "使用者管理";
        if (currentUser.role !== 'admin') {
            content.innerHTML = '<p class="text-slate-500">權限不足 (需要管理員權限)</p>';
            return;
        }

        const tmpl = document.getElementById('tmpl-users').content.cloneNode(true);
        const users = await getAllUsers();
        const tbody = tmpl.getElementById('user-list-body');

        tbody.innerHTML = users.map(u => `
            <tr class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800">
                <td class="px-6 py-4">${u.email}</td>
                <td class="px-6 py-4">${u.name}</td>
                <td class="px-6 py-4"><span class="px-2 py-1 rounded bg-slate-100 text-xs font-bold">${u.role}</span></td>
                <td class="px-6 py-4 text-right">
                    <button class="text-primary text-sm font-bold">編輯</button>
                </td>
            </tr>
        `).join('');
        content.replaceChildren(tmpl);
    }
    else if (tabName === 'courses') {
        title.textContent = "課程管理";
        const tmpl = document.getElementById('tmpl-courses').content.cloneNode(true);
        const courses = await getCourses();
        const container = tmpl.getElementById('course-list');

        container.innerHTML = courses.map(c => `
            <div class="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative group">
                <div class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                     <button class="bg-slate-100 p-1 rounded text-slate-600 hover:text-primary"><span class="material-symbols-outlined text-sm">edit</span></button>
                     <button class="bg-red-50 p-1 rounded text-red-500 hover:bg-red-100" onclick="deleteCourse('${c.id}')"><span class="material-symbols-outlined text-sm">delete</span></button>
                </div>
                <div class="flex items-center gap-2 mb-2">
                    <span class="text-xs font-bold uppercase text-primary bg-primary/10 px-2 py-1 rounded">${c.type}</span>
                </div>
                <h3 class="font-bold text-lg mb-1">${c.title}</h3>
                <p class="text-slate-500 text-sm line-clamp-2">${c.description || 'No description'}</p>
            </div>
        `).join('');
        content.replaceChildren(tmpl);
    }
    else if (tabName === 'classes') {
        title.textContent = "班級管理";
        const tmpl = document.getElementById('tmpl-classes').content.cloneNode(true);
        const classes = await getClassesForTeacher(currentUser.uid); // Admins see all? For now just teacher's.
        const container = tmpl.getElementById('class-list');

        container.innerHTML = classes.map(c => `
            <div class="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-center">
                <div>
                    <h3 class="font-bold text-lg">${c.name}</h3>
                    <div class="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        <span>代碼: <strong class="text-primary text-lg select-all">${c.code}</strong></span>
                        <span>學生: ${c.students.length} 人</span>
                    </div>
                </div>
                <button class="text-primary font-bold text-sm border border-primary/20 px-3 py-1.5 rounded hover:bg-primary/5">查看報表</button>
            </div>
        `).join('');
        content.replaceChildren(tmpl);
    }
}

// Modals
function showCourseModal() {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modal-title');
    const content = document.getElementById('modal-content');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    title.textContent = "新增課程";

    content.innerHTML = `
        <form id="add-course-form" class="space-y-4">
            <div>
                <label class="block text-sm font-bold mb-1">課程標題</label>
                <input name="title" required class="w-full rounded border-slate-300 p-2">
            </div>
            <div>
                <label class="block text-sm font-bold mb-1">類型</label>
                <select name="type" id="course-type-select" class="w-full rounded border-slate-300 p-2">
                    <option value="video">影片 (Video)</option>
                    <option value="pdf">講義 (PDF)</option>
                    <option value="practical">實作 (Practical)</option>
                    <option value="quiz">測驗 (Quiz)</option>
                </select>
            </div>
             <div>
                <label class="block text-sm font-bold mb-1">內容連結 / ID</label>
                <input name="url" required placeholder="YouTube ID or PDF URL or Tool URL" class="w-full rounded border-slate-300 p-2">
                <p class="text-xs text-slate-500 mt-1">Video: YouTube ID (e.g., dQw4w9WgXcQ)<br>PDF: URL to PDF<br>Practical: URL to tool</p>
            </div>

            <!-- Type Specific Fields -->
            <div id="video-fields" class="type-field">
                 <label class="block text-sm font-bold mb-1">需觀看秒數</label>
                 <input name="requiredSeconds" type="number" value="30" class="w-full rounded border-slate-300 p-2">
            </div>
            <div id="practical-fields" class="hidden type-field">
                 <label class="block text-sm font-bold mb-1">驗證關鍵字 (逗號分隔)</label>
                 <input name="matchText" placeholder="e.g., success, done" class="w-full rounded border-slate-300 p-2">
            </div>
            <div id="quiz-fields" class="hidden type-field">
                 <label class="block text-sm font-bold mb-1">測驗 JSON (Simple)</label>
                 <textarea name="quizData" placeholder='[{"q":"1+1?","options":["1","2"],"answer":1}]' class="w-full rounded border-slate-300 p-2 h-24 font-mono text-xs"></textarea>
            </div>

            <button type="submit" class="w-full bg-primary text-white font-bold py-2 rounded">建立課程</button>
        </form>
    `;

    // Handle Type Switch
    const select = document.getElementById('course-type-select');
    select.addEventListener('change', () => {
        document.querySelectorAll('.type-field').forEach(el => el.classList.add('hidden'));
        if (select.value === 'video') document.getElementById('video-fields').classList.remove('hidden');
        if (select.value === 'practical') document.getElementById('practical-fields').classList.remove('hidden');
        if (select.value === 'quiz') document.getElementById('quiz-fields').classList.remove('hidden');
    });

    document.getElementById('add-course-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        await saveCourse(data);
        alert("課程已建立");
        window.closeModal();
        loadTab('courses');
    });
}

function showClassModal() {
     const modal = document.getElementById('modal');
    const title = document.getElementById('modal-title');
    const content = document.getElementById('modal-content');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    title.textContent = "建立班級";

    content.innerHTML = `
        <form id="add-class-form" class="space-y-4">
            <div>
                <label class="block text-sm font-bold mb-1">班級名稱</label>
                <input name="name" required class="w-full rounded border-slate-300 p-2">
            </div>
            <button type="submit" class="w-full bg-primary text-white font-bold py-2 rounded">建立</button>
        </form>
    `;

    document.getElementById('add-class-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        await createClass(currentUser.uid, { name: formData.get('name') });
        alert("班級已建立");
        window.closeModal();
        loadTab('classes');
    });
}

window.deleteCourse = async (id) => {
    if(confirm('Are you sure?')) {
        await deleteCourseDb(id); // Import this logic
        loadTab('courses');
    }
}

init();
