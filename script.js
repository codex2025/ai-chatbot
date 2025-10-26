// ===========================
// GLOBAL VARIABLES
// ===========================
let API_KEY = '';
let API_PROVIDER = 'openai'; // openai or gemini
let conversationHistory = [];
const API_ENDPOINTS = {
    openai: 'https://api.openai.com/v1/chat/completions',
    gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
};

// ===========================
// INITIALIZATION
// ===========================
document.addEventListener('DOMContentLoaded', function() {
    // Auto-resize for textarea
    const textarea = document.getElementById('userInput');
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    // Load saved settings from session (if any)
    loadSessionSettings();
});

// ===========================
// SETTINGS FUNCTIONS
// ===========================
function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('active');
}
function updateProviderInfo() {
    const provider = document.getElementById('apiProvider').value;
    const infoDiv = document.getElementById('providerInfo');
    if (provider === 'openai') {
        infoDiv.innerHTML = `
            <p><strong>How to get OpenAI API key:</strong></p>
            <ol>
                <li>Visit <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com/api-keys</a></li>
                <li>Sign up or log in</li>
                <li>Create new secret key</li>
                <li>Copy and paste above</li>
            </ol>
            <p class="warning">⚠️ Never share your API key with anyone!</p>
        `;
    } else if (provider === 'gemini') {
        infoDiv.innerHTML = `
            <p><strong>How to get Google Gemini API key:</strong></p>
            <ol>
                <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank">aistudio.google.com</a></li>
                <li>Sign in with Google</li>
                <li>Click 'Get API Key'</li>
                <li>Copy and paste above</li>
            </ol>
            <p class="warning">⚠️ Keep your API key secure and private!</p>
        `;
    }
}
function toggleKeyVisibility() {
    const input = document.getElementById('apiKey');
    const button = document.querySelector('.toggle-key');
    if (input.type === 'password') {
        input.type = 'text';
        button.textContent = '🙈 Hide';
    } else {
        input.type = 'password';
        button.textContent = '👁️ Show';
    }
}
function saveSettings() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const provider = document.getElementById('apiProvider').value;
    if (!apiKey) {
        alert('⚠️ Please enter your API key!');
        return;
    }
    API_KEY = apiKey;
    API_PROVIDER = provider;
    document.getElementById('sendBtn').disabled = false;
    const welcomeMsg = document.querySelector('.welcome-message');
    if (welcomeMsg) welcomeMsg.remove();
    toggleSettings();
    addSystemMessage(`✅ API configured successfully! Using ${provider === 'openai' ? 'OpenAI' : 'Google Gemini'}.`);
}
function loadSessionSettings() {
    if (API_KEY) document.getElementById('sendBtn').disabled = false;
}

// ===========================
// CHAT FUNCTIONS
// ===========================
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}
async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    if (!message) return;
    if (!API_KEY) {
        alert('⚠️ Configure API key in Settings first!');
        toggleSettings();
        return;
    }
    input.value = '';
    input.style.height = 'auto';
    addMessage('user', message);
    conversationHistory.push({ role: 'user', content: message });
    showLoading(true);
    try {
        let response;
        if (API_PROVIDER === 'openai') {
            response = await callOpenAI(message);
        } else if (API_PROVIDER === 'gemini') {
            response = await callGemini(message);
        }
        addMessage('bot', response);
        conversationHistory.push({ role: 'assistant', content: response });
    } catch (error) {
        addMessage('error', `Error: ${error.message || error}. Please check your API key and try again.`);
    } finally {
        showLoading(false);
    }
}
async function callOpenAI(userMessage) {
    const response = await fetch(API_ENDPOINTS.openai, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: conversationHistory,
            max_tokens: 1000,
            temperature: 0.7
        })
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.choices[0].message.content;
}
async function callGemini(userMessage) {
    const requestBody = {
        contents: [{
            parts: [{ text: userMessage }]
        }]
    };
    const url = `${API_ENDPOINTS.gemini}?key=${API_KEY}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}
function addMessage(role, content) {
    const messagesArea = document.getElementById('messagesArea');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    let roleLabel = '', contentClass = 'message-content';
    if (role === 'user') roleLabel = 'You';
    else if (role === 'bot') roleLabel = 'AI';
    else if (role === 'error') { roleLabel = 'Error'; contentClass += ' error-message'; role = 'bot'; }
    messageDiv.innerHTML = `
        <div class="${contentClass}">
            <div class="message-role">${roleLabel}</div>
            <div class="message-text">${content}</div>
        </div>
    `;
    messagesArea.appendChild(messageDiv);
    scrollToBottom();
}
function addSystemMessage(content) {
    const messagesArea = document.getElementById('messagesArea');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="message-text">${content}</div>
        </div>
    `;
    messagesArea.appendChild(messageDiv);
    scrollToBottom();
}
function clearChat() {
    if (!confirm('Are you sure you want to clear the chat history?')) return;
    conversationHistory = [];
    document.getElementById('messagesArea').innerHTML = `
        <div class="welcome-message">
            <h2>🆕 New Conversation</h2>
            <p>Chat history cleared. Start a new conversation!</p>
        </div>
    `;
}
function scrollToBottom() {
    const messagesArea = document.getElementById('messagesArea');
    messagesArea.scrollTop = messagesArea.scrollHeight;
}
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) overlay.classList.add('active');
    else overlay.classList.remove('active');
}
