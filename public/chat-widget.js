(function() {
  'use strict';

  // Configuration
  var config = window.ChatFlowConfig || {};
  var tenantId = config.tenantId;
  var position = config.position || 'bottom-right';
  var primaryColor = config.primaryColor || '#8B5CF6';
  var apiUrl = config.apiUrl || 'https://mnsbodgadunlsqbirevx.supabase.co/functions/v1/webchat';

  if (!tenantId) {
    console.error('ChatFlow: Missing tenantId in configuration');
    return;
  }

  // State
  var state = {
    isOpen: false,
    conversationId: null,
    visitorId: localStorage.getItem('chatflow_visitor_' + tenantId),
    tenantName: '',
    messages: [],
    isStarted: false
  };

  // Styles
  var styles = document.createElement('style');
  styles.textContent = `
    .chatflow-widget * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .chatflow-button {
      position: fixed;
      ${position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      ${position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${primaryColor};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      z-index: 999998;
    }
    .chatflow-button:hover { transform: scale(1.05); box-shadow: 0 6px 16px rgba(0,0,0,0.2); }
    .chatflow-button svg { width: 28px; height: 28px; fill: white; }
    .chatflow-window {
      position: fixed;
      ${position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      ${position.includes('bottom') ? 'bottom: 90px;' : 'top: 90px;'}
      width: 380px;
      height: 520px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 999999;
    }
    .chatflow-window.open { display: flex; }
    .chatflow-header {
      background: ${primaryColor};
      color: white;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .chatflow-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
    .chatflow-header button { background: none; border: none; color: white; cursor: pointer; padding: 4px; }
    .chatflow-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .chatflow-message {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.4;
    }
    .chatflow-message.contact {
      align-self: flex-end;
      background: ${primaryColor};
      color: white;
      border-bottom-right-radius: 4px;
    }
    .chatflow-message.agent {
      align-self: flex-start;
      background: #f1f3f4;
      color: #333;
      border-bottom-left-radius: 4px;
    }
    .chatflow-form {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .chatflow-form input, .chatflow-form textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    .chatflow-form input:focus, .chatflow-form textarea:focus { border-color: ${primaryColor}; }
    .chatflow-form textarea { resize: none; height: 80px; }
    .chatflow-form button {
      background: ${primaryColor};
      color: white;
      border: none;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .chatflow-form button:hover { opacity: 0.9; }
    .chatflow-form button:disabled { opacity: 0.5; cursor: not-allowed; }
    .chatflow-input-area {
      padding: 12px 16px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      gap: 8px;
    }
    .chatflow-input-area input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #e0e0e0;
      border-radius: 24px;
      font-size: 14px;
      outline: none;
    }
    .chatflow-input-area input:focus { border-color: ${primaryColor}; }
    .chatflow-input-area button {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${primaryColor};
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .chatflow-input-area button svg { width: 18px; height: 18px; fill: white; }
    @media (max-width: 420px) {
      .chatflow-window { width: calc(100vw - 40px); height: calc(100vh - 120px); }
    }
  `;
  document.head.appendChild(styles);

  // Create widget HTML
  var container = document.createElement('div');
  container.className = 'chatflow-widget';
  container.innerHTML = `
    <button class="chatflow-button" id="chatflow-toggle">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
    </button>
    <div class="chatflow-window" id="chatflow-window">
      <div class="chatflow-header">
        <h3 id="chatflow-title">Chat with us</h3>
        <button id="chatflow-close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div id="chatflow-content"></div>
    </div>
  `;
  document.body.appendChild(container);

  // Elements
  var toggleBtn = document.getElementById('chatflow-toggle');
  var chatWindow = document.getElementById('chatflow-window');
  var closeBtn = document.getElementById('chatflow-close');
  var content = document.getElementById('chatflow-content');
  var title = document.getElementById('chatflow-title');

  // API calls
  function api(action, data) {
    return fetch(apiUrl + '?tenant_id=' + tenantId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ action: action }, data))
    }).then(function(r) { return r.json(); });
  }

  // Render functions
  function renderStartForm() {
    content.innerHTML = `
      <div class="chatflow-form">
        <input type="text" id="chatflow-name" placeholder="Your name" required>
        <input type="email" id="chatflow-email" placeholder="Your email (optional)">
        <textarea id="chatflow-message" placeholder="How can we help you?"></textarea>
        <button id="chatflow-start-btn">Start Chat</button>
      </div>
    `;
    
    document.getElementById('chatflow-start-btn').onclick = function() {
      var name = document.getElementById('chatflow-name').value.trim();
      var email = document.getElementById('chatflow-email').value.trim();
      var message = document.getElementById('chatflow-message').value.trim();
      
      if (!name) return alert('Please enter your name');
      
      this.disabled = true;
      this.textContent = 'Starting...';
      
      api('start', {
        visitor_id: state.visitorId,
        name: name,
        email: email,
        message: message
      }).then(function(res) {
        if (res.ok) {
          state.conversationId = res.conversation_id;
          state.visitorId = res.visitor_id;
          state.isStarted = true;
          localStorage.setItem('chatflow_visitor_' + tenantId, res.visitor_id);
          renderChatView();
          if (message) {
            state.messages.push({ content: message, sender_type: 'contact' });
          }
          renderMessages();
        }
      });
    };
  }

  function renderChatView() {
    content.innerHTML = `
      <div class="chatflow-messages" id="chatflow-messages"></div>
      <div class="chatflow-input-area">
        <input type="text" id="chatflow-input" placeholder="Type a message...">
        <button id="chatflow-send">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    `;

    var input = document.getElementById('chatflow-input');
    var sendBtn = document.getElementById('chatflow-send');

    function send() {
      var text = input.value.trim();
      if (!text || !state.conversationId) return;
      
      input.value = '';
      state.messages.push({ content: text, sender_type: 'contact' });
      renderMessages();

      api('send', {
        conversation_id: state.conversationId,
        message: text
      });
    }

    sendBtn.onclick = send;
    input.onkeypress = function(e) { if (e.key === 'Enter') send(); };

    // Load existing messages
    if (state.conversationId) {
      api('messages', { conversation_id: state.conversationId }).then(function(res) {
        if (res.ok && res.messages) {
          state.messages = res.messages;
          renderMessages();
        }
      });
    }

    // Poll for new messages every 3 seconds
    setInterval(function() {
      if (state.conversationId && state.isOpen) {
        api('messages', { conversation_id: state.conversationId }).then(function(res) {
          if (res.ok && res.messages && res.messages.length !== state.messages.length) {
            state.messages = res.messages;
            renderMessages();
          }
        });
      }
    }, 3000);
  }

  function renderMessages() {
    var container = document.getElementById('chatflow-messages');
    if (!container) return;
    
    container.innerHTML = state.messages.map(function(m) {
      return '<div class="chatflow-message ' + m.sender_type + '">' + escapeHtml(m.content) + '</div>';
    }).join('');
    
    container.scrollTop = container.scrollHeight;
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize
  function init() {
    api('init', { visitor_id: state.visitorId }).then(function(res) {
      if (res.ok) {
        state.tenantName = res.tenant_name;
        title.textContent = 'Chat with ' + res.tenant_name;
        if (res.conversation_id) {
          state.conversationId = res.conversation_id;
          state.isStarted = true;
        }
      }
    });
  }

  // Event handlers
  toggleBtn.onclick = function() {
    state.isOpen = !state.isOpen;
    chatWindow.classList.toggle('open', state.isOpen);
    
    if (state.isOpen && !content.innerHTML) {
      if (state.isStarted && state.conversationId) {
        renderChatView();
      } else {
        renderStartForm();
      }
    }
  };

  closeBtn.onclick = function() {
    state.isOpen = false;
    chatWindow.classList.remove('open');
  };

  init();
})();
