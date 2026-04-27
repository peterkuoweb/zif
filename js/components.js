// js/components.js

// --- UI Rendering Functions ---

function renderProviderCards(containerId, selectedProviderId = null, onSelect = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const providersData = [
        {
            id: 'openai',
            name: 'OpenAI',
            icon: 'fa-cube',
            color: 'text-emerald-500',
            bg: 'bg-emerald-50',
            pros: ['最聰明、邏輯最強', '適合複雜任務'],
            cons: ['需要付費', '速度可能較慢']
        },
        {
            id: 'google',
            name: 'Google Gemini',
            icon: 'fa-google',
            color: 'text-blue-500',
            bg: 'bg-blue-50',
            pros: ['多模態能力強', '免費額度較高'],
            cons: ['有時會產生幻覺', 'API 格式較嚴格']
        },
        {
            id: 'groq',
            name: 'Groq',
            icon: 'fa-bolt',
            color: 'text-orange-500',
            bg: 'bg-orange-50',
            pros: ['生成速度極快', '開源模型選擇多'],
            cons: ['不支援圖片', '複雜邏輯稍弱']
        }
    ];

    container.innerHTML = '';

    providersData.forEach(p => {
        const card = document.createElement('div');
        const isSelected = selectedProviderId === p.id;

        card.className = `provider-card cursor-pointer rounded-2xl p-6 border-2 ${isSelected ? 'selected border-indigo-600 bg-indigo-50' : 'border-gray-100 bg-white hover:border-indigo-200'}`;
        card.dataset.id = p.id;

        card.innerHTML = `
            <div class="flex items-center gap-4 mb-4">
                <div class="w-12 h-12 rounded-xl ${p.bg} flex items-center justify-center">
                    <i class="fab ${p.icon} text-2xl ${p.color}"></i>
                </div>
                <h4 class="text-xl font-bold text-gray-800">${p.name}</h4>
                ${isSelected ? '<i class="fas fa-check-circle text-indigo-600 ml-auto text-xl"></i>' : ''}
            </div>
            <div class="space-y-3">
                <div>
                    <span class="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1 block">優點</span>
                    <ul class="text-sm text-gray-600 space-y-1">
                        ${p.pros.map(pro => `<li><i class="fas fa-check text-emerald-500 mr-2"></i>${pro}</li>`).join('')}
                    </ul>
                </div>
                <div>
                    <span class="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1 block">缺點</span>
                    <ul class="text-sm text-gray-600 space-y-1">
                        ${p.cons.map(con => `<li><i class="fas fa-times text-rose-500 mr-2"></i>${con}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;

        if (onSelect) {
            card.addEventListener('click', () => onSelect(p.id));
        }

        container.appendChild(card);
    });
}

function renderExplorerItems(items, containerId, activeItemId, onFolderClick, onNotebookClick) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (items.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-400 text-sm mt-8">
                <i class="fas fa-folder-open text-2xl mb-2 opacity-50"></i>
                <p>尚無資料</p>
            </div>`;
        return;
    }

    // Build tree map (for simplicity in this basic version, we just render flat,
    // or group by parentId if implementing true nested folders)
    // For this implementation, we render folders first, then notebooks.

    const folders = items.filter(i => i.type === 'folder');
    const notebooks = items.filter(i => i.type === 'notebook');

    folders.forEach(folder => {
        const el = document.createElement('div');
        el.className = 'group flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors';
        el.innerHTML = `
            <div class="flex items-center gap-3 text-gray-700 font-medium">
                <i class="fas fa-folder text-indigo-300"></i>
                <span class="truncate w-32">${folder.name}</span>
            </div>
            <button class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1" onclick="event.stopPropagation(); window.app.deleteItem('${folder.id}')">
                <i class="fas fa-trash-alt text-xs"></i>
            </button>
        `;
        el.onclick = () => onFolderClick(folder.id);
        container.appendChild(el);
    });

    notebooks.forEach(notebook => {
        const el = document.createElement('div');
        const isActive = activeItemId === notebook.id;
        el.className = `group flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${isActive ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-gray-50'}`;
        el.innerHTML = `
            <div class="flex items-center gap-3 ${isActive ? 'text-indigo-700 font-bold' : 'text-gray-600 font-medium'}">
                <i class="fas fa-book-open ${isActive ? 'text-indigo-500' : 'text-gray-400'}"></i>
                <span class="truncate w-32">${notebook.name}</span>
            </div>
            <button class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1" onclick="event.stopPropagation(); window.app.deleteItem('${notebook.id}')">
                <i class="fas fa-trash-alt text-xs"></i>
            </button>
        `;
        el.onclick = () => onNotebookClick(notebook.id);
        container.appendChild(el);
    });
}

function renderSources(sources, containerId, activeSourceIds, onToggleSource, onDeleteSource) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (sources.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-400 text-sm mt-10">
                <i class="fas fa-inbox text-3xl mb-2 opacity-50"></i>
                <p>尚無來源資料</p>
                <p class="text-xs mt-1">點擊上方 + 號上傳文件</p>
            </div>`;
        return;
    }

    container.innerHTML = '';

    sources.forEach(source => {
        const isActive = activeSourceIds.includes(source.id);
        const el = document.createElement('div');
        el.className = 'group relative';

        el.innerHTML = `
            <label class="flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${isActive ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 bg-white hover:border-indigo-200'}">
                <div class="mt-1 relative flex items-center justify-center">
                    <input type="checkbox" class="peer sr-only" ${isActive ? 'checked' : ''} value="${source.id}">
                    <div class="w-5 h-5 border-2 rounded text-indigo-600 border-gray-300 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 flex items-center justify-center transition-colors">
                        <i class="fas fa-check text-white text-xs opacity-0 peer-checked:opacity-100"></i>
                    </div>
                </div>
                <div class="flex-1 overflow-hidden">
                    <div class="font-medium text-gray-800 text-sm truncate">${source.name}</div>
                    <div class="text-xs text-gray-500 mt-1 line-clamp-2">${source.summary.substring(0, 60)}...</div>
                </div>
            </label>
            <button class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 flex items-center justify-center transition-all shadow-sm z-10" title="刪除來源" onclick="event.preventDefault(); window.app.deleteSource('${source.id}')">
                <i class="fas fa-trash-alt text-[10px]"></i>
            </button>
        `;

        const checkbox = el.querySelector('input');
        checkbox.addEventListener('change', (e) => onToggleSource(source.id, e.target.checked));

        container.appendChild(el);
    });
}

function renderChatMessages(messages, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (messages.length === 0) {
        container.innerHTML = `
            <div class="flex items-center justify-center h-full opacity-50">
                <div class="text-center">
                    <i class="fas fa-sparkles text-4xl text-indigo-300 mb-3"></i>
                    <p class="text-gray-500">選擇來源並開始對話</p>
                </div>
            </div>`;
        return;
    }

    container.innerHTML = '';

    messages.forEach(msg => {
        const isUser = msg.role === 'user';
        const el = document.createElement('div');
        el.className = `flex chat-message w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6`;

        // Use marked to parse markdown if it's from AI
        let contentHtml = msg.content;
        if (!isUser) {
             contentHtml = `<div class="markdown-body">${marked.parse(msg.content)}</div>`;
        }

        const sourceTagsHtml = (msg.sources && msg.sources.length > 0)
            ? `<div class="flex flex-wrap gap-1 mt-3 pt-3 border-t border-black/5">
                ${msg.sources.map(s => `<span class="px-2 py-0.5 bg-black/5 rounded text-[10px] text-gray-500 flex items-center gap-1"><i class="fas fa-paperclip"></i> ${s.name}</span>`).join('')}
               </div>`
            : '';

        el.innerHTML = `
            <div class="flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2">
                <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm ${isUser ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-indigo-600'}">
                    <i class="fas ${isUser ? 'fa-user' : 'fa-robot'}"></i>
                </div>
                <div class="p-4 rounded-2xl shadow-sm ${isUser ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'}">
                    <div class="${isUser ? 'whitespace-pre-wrap' : ''}">
                        ${contentHtml}
                    </div>
                    ${sourceTagsHtml}
                </div>
            </div>
        `;

        container.appendChild(el);
    });

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function renderModelOptions(selectElementId, models, selectedModelId = null) {
    const select = document.getElementById(selectElementId);
    if (!select) return;

    select.innerHTML = '';

    if (models.length === 0) {
        select.innerHTML = '<option value="">無可用模型</option>';
        return;
    }

    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        if (model.id === selectedModelId) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}
