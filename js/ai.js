// js/ai.js

// AI Provider configurations
const providers = {
    openai: {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        modelsEndpoint: '/models',
        chatEndpoint: '/chat/completions',
        headers: (apiKey) => ({
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        })
    },
    google: {
        name: 'Google Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        modelsEndpoint: '/models?key=',
        chatEndpoint: (model, key) => `/models/${model}:generateContent?key=${key}`,
        headers: () => ({
            'Content-Type': 'application/json'
        })
    },
    groq: {
        name: 'Groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        modelsEndpoint: '/models',
        chatEndpoint: '/chat/completions',
        headers: (apiKey) => ({
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        })
    }
};

/**
 * Fetches available models for a given provider and API key.
 */
async function fetchModels(providerId, apiKey) {
    const provider = providers[providerId];
    if (!provider) throw new Error('未知的供應商');

    try {
        let url = provider.baseUrl + provider.modelsEndpoint;
        let options = {
            method: 'GET',
            headers: provider.headers(apiKey)
        };

        if (providerId === 'google') {
             url = provider.baseUrl + provider.modelsEndpoint + apiKey;
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Format the models list to a unified structure [{id, name}]
        let models = [];
        if (providerId === 'openai' || providerId === 'groq') {
             models = data.data.map(m => ({ id: m.id, name: m.id }));
             // Filter out non-chat models roughly for OpenAI
             if (providerId === 'openai') {
                 models = models.filter(m => m.id.includes('gpt'));
             }
        } else if (providerId === 'google') {
             models = data.models
                .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                .map(m => ({ id: m.name.replace('models/', ''), name: m.displayName || m.name.replace('models/', '') }));
        }

        return models;

    } catch (error) {
        console.error("Error fetching models:", error);
        throw new Error(`無法獲取模型: ${error.message}`);
    }
}

/**
 * Sends a chat completion request to the AI provider.
 */
async function generateCompletion(providerId, apiKey, model, messages, systemPrompt = null) {
     const provider = providers[providerId];
     if (!provider) throw new Error('未知的供應商');

     try {
         if (providerId === 'openai' || providerId === 'groq') {
             const apiMessages = [...messages];
             if (systemPrompt) {
                 apiMessages.unshift({ role: 'system', content: systemPrompt });
             }

             const response = await fetch(provider.baseUrl + provider.chatEndpoint, {
                 method: 'POST',
                 headers: provider.headers(apiKey),
                 body: JSON.stringify({
                     model: model,
                     messages: apiMessages
                 })
             });

             if (!response.ok) throw new Error(`API Error: ${response.status}`);
             const data = await response.json();
             return data.choices[0].message.content;

         } else if (providerId === 'google') {
             // Convert generic message format to Gemini format
             let contents = messages.map(msg => ({
                 role: msg.role === 'user' ? 'user' : 'model',
                 parts: [{ text: msg.content }]
             }));

             const payload = { contents: contents };
             if (systemPrompt) {
                 // Gemini system instructions (supported on newer models)
                 payload.systemInstruction = {
                     parts: [{ text: systemPrompt }]
                 };
             }

             const url = provider.baseUrl + provider.chatEndpoint(model, apiKey);
             const response = await fetch(url, {
                 method: 'POST',
                 headers: provider.headers(),
                 body: JSON.stringify(payload)
             });

             if (!response.ok) throw new Error(`API Error: ${response.status}`);
             const data = await response.json();
             return data.candidates[0].content.parts[0].text;
         }

     } catch (error) {
         console.error("Error generating completion:", error);
         throw new Error(`產生回應失敗: ${error.message}`);
     }
}

/**
 * Helper to process file content and generate a summary
 */
async function summarizeDocument(providerId, apiKey, model, text, filename) {
    const systemPrompt = `你是一個專業的文件分析助手。你的任務是將使用者上傳的文件整理成純文字格式。

重要指示：
1. 請保留所有重要細節，這不是一個簡短的摘要，而是一個「結構化、詳細的文字轉換」。
2. 絕對不能漏掉任何資訊，因為使用者未來會依靠這些文字來搜尋細節。
3. 如果文件中有提到「頁碼」、「章節」、「條目」，請務必標示清楚（例如：[第5頁]、[第二章]）。
4. 請使用 Markdown 格式來組織內容，使其易於閱讀（使用標題、列表、粗體等）。
5. 盡可能保持原文的語氣和邏輯結構。`;

    const prompt = `請整理以下名為「${filename}」的文件內容：\n\n${text.substring(0, 30000)}`; // Limit length basic

    return await generateCompletion(providerId, apiKey, model, [{role: 'user', content: prompt}], systemPrompt);
}