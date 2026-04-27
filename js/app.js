// js/app.js

class App {
    constructor() {
        this.settings = {
            isSetupComplete: false,
            provider: null,
            apiKey: null,
            model: null,
            language: 'zh-TW'
        };
        this.items = [];
        this.currentNotebookId = null;
        this.sources = [];
        this.activeSourceIds = [];
        this.messages = [];

        // Expose to window for inline onclick handlers (temporary measure, better to use event delegation)
        window.app = this;
    }

    async init() {
        this.showLoading('初始化系統...');
        try {
            await initDB();
            await this.loadSettings();

            if (!this.settings.isSetupComplete) {
                this.hideLoading();
                this.startSetupFlow();
            } else {
                await this.loadWorkspace();
                this.hideLoading();
            }
        } catch (error) {
            console.error("Initialization error:", error);
            alert("初始化失敗，請重新整理頁面。\n錯誤: " + error.message);
            this.hideLoading();
        }
    }

    // --- Loading UI ---
    showLoading(text = '載入中...') {
        document.getElementById('loadingText').textContent = text;
        document.getElementById('loadingOverlay').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }

    // --- Settings Logic ---
    async loadSettings() {
        const keys = ['isSetupComplete', 'provider', 'apiKey', 'model', 'language'];
        for (const key of keys) {
            const val = await getSetting(key);
            if (val !== null) this.settings[key] = val;
        }
    }

    async updateSetting(key, value) {
        this.settings[key] = value;
        await saveSetting(key, value);
    }

    // --- Setup Flow ---
    startSetupFlow() {
        const modal = document.getElementById('setupModal');
        modal.classList.remove('hidden');

        let currentStep = 1;
        let tempProvider = null;
        let tempApiKey = null;
        let availableModels = [];

        const updateUI = () => {
            // Update steps visibility
            document.getElementById('setupStep1').classList.toggle('hidden', currentStep !== 1);
            document.getElementById('setupStep2').classList.toggle('hidden', currentStep !== 2);
            document.getElementById('setupStep3').classList.toggle('hidden', currentStep !== 3);

            // Update indicators
            const indicators = document.getElementById('setupStepIndicators').children;
            for (let i = 0; i < 3; i++) {
                indicators[i].className = `w-3 h-3 rounded-full ${i + 1 <= currentStep ? 'bg-indigo-600' : 'bg-gray-300'}`;
            }

            // Buttons
            const prevBtn = document.getElementById('setupPrevBtn');
            const nextBtn = document.getElementById('setupNextBtn');

            prevBtn.classList.toggle('hidden', currentStep === 1);

            if (currentStep === 1) {
                nextBtn.textContent = '下一步';
                nextBtn.disabled = !tempProvider;
                renderProviderCards('providerCards', tempProvider, (id) => {
                    tempProvider = id;
                    updateUI(); // Re-render to show selection
                });
            } else if (currentStep === 2) {
                nextBtn.textContent = '驗證並繼續';
                nextBtn.disabled = false;
            } else if (currentStep === 3) {
                nextBtn.textContent = '完成設定';
                nextBtn.disabled = availableModels.length === 0;
            }
        };

        document.getElementById('setupPrevBtn').onclick = () => {
            if (currentStep > 1) currentStep--;
            updateUI();
        };

        document.getElementById('setupNextBtn').onclick = async () => {
            if (currentStep === 1) {
                currentStep++;
                updateUI();
            } else if (currentStep === 2) {
                tempApiKey = document.getElementById('apiKeyInput').value.trim();
                if (!tempApiKey) {
                    alert('請輸入 API 金鑰');
                    return;
                }

                this.showLoading('正在驗證金鑰並獲取模型...');
                try {
                    availableModels = await fetchModels(tempProvider, tempApiKey);
                    renderModelOptions('modelSelect', availableModels);
                    currentStep++;
                    updateUI();
                } catch (error) {
                    alert('驗證失敗: ' + error.message);
                } finally {
                    this.hideLoading();
                }
            } else if (currentStep === 3) {
                const selectedModel = document.getElementById('modelSelect').value;
                if (!selectedModel) {
                    alert('請選擇模型');
                    return;
                }

                // Save settings
                await this.updateSetting('provider', tempProvider);
                await this.updateSetting('apiKey', tempApiKey);
                await this.updateSetting('model', selectedModel);
                await this.updateSetting('isSetupComplete', true);

                modal.classList.add('hidden');

                // Show a quick tour/welcome alert (simple implementation)
                alert('設定完成！歡迎使用 Opensia。\n您可以在左側建立筆記本並上傳文件開始。');

                await this.loadWorkspace();
            }
        };

        updateUI();
    }

    // --- Settings Modal Logic ---
    initSettingsModal() {
        const modal = document.getElementById('settingsModal');
        const openBtn = document.getElementById('openSettingsBtn');
        const closeBtn = document.getElementById('closeSettingsBtn');
        const saveBtn = document.getElementById('saveSettingsBtn');
        const refreshBtn = document.getElementById('settingsRefreshModels');

        const providerSelect = document.getElementById('settingsProvider');
        const apiKeyInput = document.getElementById('settingsApiKey');
        const modelSelect = document.getElementById('settingsModel');
        const langSelect = document.getElementById('settingsLanguage');

        const populateModal = async () => {
            providerSelect.value = this.settings.provider || 'openai';
            apiKeyInput.value = this.settings.apiKey || '';
            langSelect.value = this.settings.language || 'zh-TW';

            if (this.settings.provider && this.settings.apiKey) {
                try {
                    const models = await fetchModels(this.settings.provider, this.settings.apiKey);
                    renderModelOptions('settingsModel', models, this.settings.model);
                } catch (e) {
                    renderModelOptions('settingsModel', []);
                }
            } else {
                renderModelOptions('settingsModel', []);
            }
        };

        openBtn.addEventListener('click', async () => {
            await populateModal();
            modal.classList.remove('hidden');
        });

        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        refreshBtn.addEventListener('click', async () => {
            const provider = providerSelect.value;
            const key = apiKeyInput.value.trim();
            if (!key) {
                alert('請先輸入 API 金鑰');
                return;
            }

            const btnIcon = refreshBtn.querySelector('i');
            btnIcon.classList.add('fa-spin');

            try {
                const models = await fetchModels(provider, key);
                renderModelOptions('settingsModel', models, this.settings.model);
            } catch (e) {
                alert('獲取模型失敗: ' + e.message);
                renderModelOptions('settingsModel', []);
            } finally {
                btnIcon.classList.remove('fa-spin');
            }
        });

        // Clear models if provider changes
        providerSelect.addEventListener('change', () => {
            renderModelOptions('settingsModel', []);
        });

        saveBtn.addEventListener('click', async () => {
            const provider = providerSelect.value;
            const key = apiKeyInput.value.trim();
            const model = modelSelect.value;
            const lang = langSelect.value;

            if (!key || !model) {
                alert('請確保 API 金鑰已輸入且已選擇模型');
                return;
            }

            await this.updateSetting('provider', provider);
            await this.updateSetting('apiKey', key);
            await this.updateSetting('model', model);
            await this.updateSetting('language', lang);

            modal.classList.add('hidden');

            // Re-initialize workspace if needed, though settings usually take effect on next generation
            alert('設定已儲存');
        });
    }

    async loadWorkspace() {
        this.initSettingsModal();

        // Load items from DB
        this.items = await getItems() || [];
        this.renderExplorer();

        // Bind explorer buttons
        document.getElementById('addFolderBtn').onclick = () => this.createNewItem('folder');
        document.getElementById('addNotebookBtn').onclick = () => this.createNewItem('notebook');

        // Bind file upload
        document.getElementById('uploadSourceInput').onchange = (e) => this.handleFileUpload(e);

        // Bind Chat
        document.getElementById('sendChatBtn').onclick = () => this.handleChatSubmit();
        document.getElementById('chatInput').onkeypress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleChatSubmit();
            }
        };

        // Mobile sidebar toggle
        document.getElementById('toggleSidebarBtn').onclick = () => {
             const sidebar = document.getElementById('sidebar');
             sidebar.classList.toggle('-translate-x-full');
             sidebar.classList.toggle('absolute');
             sidebar.classList.toggle('h-full');
        };

        // Bind Lab Buttons
        document.querySelectorAll('.lab-btn').forEach(btn => {
            btn.onclick = () => {
                if (this.activeSourceIds.length === 0) {
                    alert('請至少選擇一個來源資料');
                    return;
                }
                const type = btn.dataset.type;
                window.openLabModal(type, this);
            };
        });
    }

    // --- File Explorer Logic ---

    async createNewItem(type) {
        const defaultName = type === 'folder' ? '新資料夾' : '新筆記本';
        const name = prompt(`請輸入${type === 'folder' ? '資料夾' : '筆記本'}名稱:`, defaultName);
        if (!name) return;

        const newItem = {
            id: Date.now().toString(),
            type: type,
            name: name,
            parentId: null, // Flat structure for now
            createdAt: Date.now()
        };

        await addItem(newItem);
        this.items.push(newItem);
        this.renderExplorer();

        if (type === 'notebook') {
            await this.selectNotebook(newItem.id);
        }
    }

    async deleteItem(id) {
        if (!confirm('確定要刪除嗎？')) return;

        await deleteItem(id);
        this.items = this.items.filter(i => i.id !== id);

        if (this.currentNotebookId === id) {
            this.currentNotebookId = null;
            this.updateWorkspaceVisibility();
        }

        this.renderExplorer();
    }

    renderExplorer() {
        renderExplorerItems(
            this.items,
            'fileExplorer',
            this.currentNotebookId,
            (id) => console.log('Folder clicked', id), // Implement expand/collapse if needed
            (id) => this.selectNotebook(id)
        );
    }

    // --- Notebook Workspace Logic ---

    async selectNotebook(id) {
        this.currentNotebookId = id;
        this.activeSourceIds = []; // Reset active sources on switch

        const notebook = this.items.find(i => i.id === id);
        if (notebook) {
            document.getElementById('currentNotebookTitle').textContent = notebook.name;
        }

        this.updateWorkspaceVisibility();

        // Load sources and messages for this notebook
        this.sources = await getSourcesByNotebook(id) || [];
        this.messages = await getMessagesByNotebook(id) || [];

        this.renderSourcesList();
        this.renderChat();
        this.renderExplorer(); // update active state in UI
    }

    updateWorkspaceVisibility() {
        const hasNotebook = !!this.currentNotebookId;
        document.getElementById('mainWorkspace').classList.toggle('hidden', !hasNotebook);
        document.getElementById('emptyWorkspace').classList.toggle('hidden', hasNotebook);
    }

    // --- Sources Logic ---

    async handleFileUpload(event) {
        if (!this.currentNotebookId) return;

        const files = event.target.files;
        if (!files || files.length === 0) return;

        this.showLoading('正在處理文件與使用 AI 擷取內容，這可能需要一些時間...');

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                let extractedText = '';

                // Simple text extraction based on file type
                if (file.type === 'text/plain' || file.name.endsWith('.md')) {
                    extractedText = await file.text();
                } else if (file.type === 'application/pdf') {
                    // Note: Needs pdf.js integrated properly. For this demo context,
                    // if pdf.js is not fully set up to read text, we simulate it or use a basic fallback.
                    // Assuming pdf.js is loaded globally via CDN in a real app.
                    extractedText = await this.extractPdfText(file);
                } else {
                    alert(`不支援的檔案格式: ${file.name}`);
                    continue;
                }

                if (!extractedText) continue;

                // Send to AI for formatting/summarization as requested
                document.getElementById('loadingText').textContent = `AI 正在整理 ${file.name}...`;

                const summaryText = await summarizeDocument(
                    this.settings.provider,
                    this.settings.apiKey,
                    this.settings.model,
                    extractedText,
                    file.name
                );

                const newSource = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    notebookId: this.currentNotebookId,
                    name: file.name,
                    summary: summaryText, // Storing only the formatted text
                    createdAt: Date.now()
                };

                await addSource(newSource);
                this.sources.push(newSource);
                // Auto-select new source
                this.activeSourceIds.push(newSource.id);
            }

            this.renderSourcesList();
        } catch (error) {
            console.error("Upload error:", error);
            alert("處理文件時發生錯誤: " + error.message);
        } finally {
            this.hideLoading();
            event.target.value = ''; // Reset input
        }
    }

    async extractPdfText(file) {
        // A placeholder for actual PDF text extraction using pdf.js
        // For the sake of this implementation, we will mock it if pdfjsLib is not available
        if (typeof pdfjsLib !== 'undefined') {
             try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                let fullText = '';
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += `[第${pageNum}頁]\n${pageText}\n\n`;
                }
                return fullText;
             } catch(e) {
                 console.error("PDF Extraction failed:", e);
                 return `[模擬 PDF 內容] 檔名: ${file.name}\n這是一段無法正常解析的 PDF 內容。`;
             }
        } else {
             return `[模擬 PDF 內容] 檔名: ${file.name}\n因為找不到 pdf.js，這是模擬的擷取文字。請確保頁面有載入 pdf.js。`;
        }
    }

    async deleteSource(id) {
        if (!confirm('確定要刪除此來源嗎？')) return;
        await deleteSource(id);
        this.sources = this.sources.filter(s => s.id !== id);
        this.activeSourceIds = this.activeSourceIds.filter(activeId => activeId !== id);
        this.renderSourcesList();
    }

    toggleActiveSource(id, isActive) {
        if (isActive) {
            if (!this.activeSourceIds.includes(id)) this.activeSourceIds.push(id);
        } else {
            this.activeSourceIds = this.activeSourceIds.filter(activeId => activeId !== id);
        }
        this.renderSourcesList(); // Re-render to update tags in chat
    }

    renderSourcesList() {
        renderSources(
            this.sources,
            'sourcesList',
            this.activeSourceIds,
            (id, active) => this.toggleActiveSource(id, active),
            (id) => this.deleteSource(id)
        );
        this.updateActiveSourcesIndicator();
    }

    updateActiveSourcesIndicator() {
        const container = document.getElementById('activeSourcesIndicator');
        container.innerHTML = '';

        const activeSources = this.sources.filter(s => this.activeSourceIds.includes(s.id));
        if (activeSources.length > 0) {
            activeSources.forEach(s => {
                const tag = document.createElement('span');
                tag.className = 'px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-lg flex items-center gap-1 border border-indigo-200';
                tag.innerHTML = `<i class="fas fa-paperclip"></i> <span class="truncate max-w-[100px]">${s.name}</span>`;
                container.appendChild(tag);
            });
        }
    }

    // --- Chat Logic ---

    async handleChatSubmit() {
        const inputEl = document.getElementById('chatInput');
        const text = inputEl.value.trim();
        if (!text || !this.currentNotebookId) return;

        const btnEl = document.getElementById('sendChatBtn');
        btnEl.disabled = true;
        inputEl.value = '';

        // Get active sources content
        const activeSourcesData = this.sources.filter(s => this.activeSourceIds.includes(s.id));

        // 1. Save user message
        const userMsg = {
            id: Date.now().toString(),
            notebookId: this.currentNotebookId,
            role: 'user',
            content: text,
            timestamp: Date.now()
        };
        await addMessage(userMsg);
        this.messages.push(userMsg);
        this.renderChat();

        // 2. Prepare context for AI
        let systemPrompt = "你是一個有用的學習助手。請根據提供的「來源資料」來回答使用者的問題。如果來源資料中沒有相關資訊，請誠實告知。\n\n";
        if (activeSourcesData.length > 0) {
            systemPrompt += "【來源資料】\n";
            activeSourcesData.forEach(s => {
                systemPrompt += `--- 檔案：${s.name} ---\n${s.summary}\n\n`;
            });
        } else {
            systemPrompt += "（使用者目前沒有選擇任何來源資料，請依一般常識回答）";
        }

        // Add a temporary loading message
        const tempMsgId = 'temp_loading';
        this.messages.push({ id: tempMsgId, role: 'assistant', content: '<i class="fas fa-circle-notch fa-spin"></i> 思考中...' });
        this.renderChat();

        // 3. Call AI
        try {
            // Prepare message history (last 10 messages for context)
            const chatHistory = this.messages
                .filter(m => m.id !== tempMsgId)
                .slice(-10)
                .map(m => ({ role: m.role, content: m.content }));

            const responseContent = await generateCompletion(
                this.settings.provider,
                this.settings.apiKey,
                this.settings.model,
                chatHistory,
                systemPrompt
            );

            // Remove temp msg
            this.messages = this.messages.filter(m => m.id !== tempMsgId);

            // 4. Save AI response
            const aiMsg = {
                id: Date.now().toString(),
                notebookId: this.currentNotebookId,
                role: 'assistant',
                content: responseContent,
                sources: activeSourcesData.map(s => ({ id: s.id, name: s.name })), // Attach source metadata
                timestamp: Date.now()
            };

            await addMessage(aiMsg);
            this.messages.push(aiMsg);

        } catch (error) {
            console.error("Chat error:", error);
            this.messages = this.messages.filter(m => m.id !== tempMsgId);
            alert("對話發生錯誤: " + error.message);
        } finally {
            btnEl.disabled = false;
            this.renderChat();
        }
    }

    renderChat() {
        renderChatMessages(this.messages, 'chatHistory');
    }
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});