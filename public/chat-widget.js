(function() {
  'use strict';

  // Configuration
  var config = window.ChatFlowConfig || {};
  var tenantId = config.tenantId;
  var position = config.position || 'bottom-right';
  var primaryColor = config.primaryColor || '#8B5CF6';
  var apiUrl = config.apiUrl || 'http://localhost:8000/api/functions/webchat';
  var uploadUrl = config.uploadUrl || 'http://localhost:8000/api/functions/upload-chat-attachment';

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
    isStarted: false,
    isUploading: false
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
    .chatflow-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
    }
    .chatflow-messages {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 0;
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
    .chatflow-message img {
      max-width: 100%;
      border-radius: 8px;
      margin-bottom: 4px;
      cursor: pointer;
    }
    .chatflow-message .file-attachment {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: rgba(0,0,0,0.1);
      border-radius: 8px;
      text-decoration: none;
      color: inherit;
    }
    .chatflow-message .file-attachment:hover { background: rgba(0,0,0,0.15); }
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
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;
      background: white;
    }
    .chatflow-input-row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    .chatflow-media-buttons {
      display: flex;
      gap: 4px;
    }
    .chatflow-media-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #f1f3f4;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    .chatflow-media-btn:hover { background: #e0e0e0; }
    .chatflow-media-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .chatflow-media-btn svg { width: 16px; height: 16px; fill: #666; }
    .chatflow-input-area input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #e0e0e0;
      border-radius: 24px;
      font-size: 14px;
      outline: none;
    }
    .chatflow-input-area input:focus { border-color: ${primaryColor}; }
    .chatflow-input-area .send-btn {
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
    .chatflow-input-area .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .chatflow-input-area .send-btn svg { width: 18px; height: 18px; fill: white; }
    .chatflow-pending-media {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: #f1f3f4;
      border-radius: 8px;
    }
    .chatflow-pending-media img {
      height: 40px;
      width: 40px;
      object-fit: cover;
      border-radius: 4px;
    }
    .chatflow-pending-media .file-icon {
      height: 40px;
      width: 40px;
      background: #e0e0e0;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: #666;
    }
    .chatflow-pending-media span { flex: 1; font-size: 12px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .chatflow-pending-media button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      color: #999;
    }
    .chatflow-uploading {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: #f1f3f4;
      border-radius: 8px;
      font-size: 12px;
      color: #666;
    }
    .chatflow-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #e0e0e0;
      border-top-color: ${primaryColor};
      border-radius: 50%;
      animation: chatflow-spin 0.8s linear infinite;
    }
    @keyframes chatflow-spin { to { transform: rotate(360deg); } }
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
      <div id="chatflow-content" class="chatflow-content"></div>
    </div>
  `;
  document.body.appendChild(container);

  // Elements
  var toggleBtn = document.getElementById('chatflow-toggle');
  var chatWindow = document.getElementById('chatflow-window');
  var closeBtn = document.getElementById('chatflow-close');
  var content = document.getElementById('chatflow-content');
  var title = document.getElementById('chatflow-title');

  // Pending media state
  var pendingMedia = null;

  // API calls
  function api(action, data) {
    return fetch(apiUrl + '?tenant_id=' + tenantId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ action: action }, data))
    }).then(function(r) { return r.json(); });
  }

  // Upload file
  function uploadFile(file) {
    return new Promise(function(resolve, reject) {
      var formData = new FormData();
      formData.append('file', file);
      formData.append('tenant_id', tenantId);
      if (state.conversationId) {
        formData.append('conversation_id', state.conversationId);
      }

      fetch(uploadUrl, {
        method: 'POST',
        body: formData
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.ok) {
          resolve(data);
        } else {
          reject(new Error(data.error || 'Upload failed'));
        }
      })
      .catch(reject);
    });
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
        <div id="chatflow-pending-preview"></div>
        <div id="chatflow-upload-status"></div>
        <div class="chatflow-input-row">
          <div class="chatflow-media-buttons">
            <button class="chatflow-media-btn" id="chatflow-image-btn" title="Upload image">
              <svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
            </button>
            <button class="chatflow-media-btn" id="chatflow-file-btn" title="Attach file">
              <svg viewBox="0 0 24 24"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>
            </button>
          </div>
          <input type="text" id="chatflow-input" placeholder="Type a message...">
          <button class="send-btn" id="chatflow-send">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
      <input type="file" id="chatflow-image-input" accept="image/*" style="display:none">
      <input type="file" id="chatflow-file-input" accept="image/*,.pdf,.doc,.docx,.txt" style="display:none">
    `;

    var input = document.getElementById('chatflow-input');
    var sendBtn = document.getElementById('chatflow-send');
    var imageBtn = document.getElementById('chatflow-image-btn');
    var fileBtn = document.getElementById('chatflow-file-btn');
    var imageInput = document.getElementById('chatflow-image-input');
    var fileInput = document.getElementById('chatflow-file-input');
    var pendingPreview = document.getElementById('chatflow-pending-preview');
    var uploadStatus = document.getElementById('chatflow-upload-status');

    function updatePendingPreview() {
      if (!pendingMedia) {
        pendingPreview.innerHTML = '';
        return;
      }

      var isImage = pendingMedia.type === 'image';
      pendingPreview.innerHTML = `
        <div class="chatflow-pending-media">
          ${isImage ? '<img src="' + pendingMedia.url + '" alt="">' : '<div class="file-icon">FILE</div>'}
          <span>${escapeHtml(pendingMedia.filename)}</span>
          <button id="chatflow-remove-media">✕</button>
        </div>
      `;

      document.getElementById('chatflow-remove-media').onclick = function() {
        pendingMedia = null;
        updatePendingPreview();
      };
    }

    function showUploading(show) {
      state.isUploading = show;
      uploadStatus.innerHTML = show ? '<div class="chatflow-uploading"><div class="chatflow-spinner"></div>Uploading...</div>' : '';
      imageBtn.disabled = show;
      fileBtn.disabled = show;
    }

    function handleFileUpload(file, type) {
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        alert('File too large (max 10MB)');
        return;
      }

      showUploading(true);

      uploadFile(file).then(function(res) {
        pendingMedia = {
          url: res.url,
          type: res.type,
          filename: res.filename
        };
        updatePendingPreview();
        showUploading(false);
      }).catch(function(err) {
        alert('Upload failed: ' + err.message);
        showUploading(false);
      });
    }

    imageBtn.onclick = function() { imageInput.click(); };
    fileBtn.onclick = function() { fileInput.click(); };

    imageInput.onchange = function(e) {
      var file = e.target.files[0];
      if (file) handleFileUpload(file, 'image');
      e.target.value = '';
    };

    fileInput.onchange = function(e) {
      var file = e.target.files[0];
      if (file) {
        var type = file.type.startsWith('image/') ? 'image' : 'file';
        handleFileUpload(file, type);
      }
      e.target.value = '';
    };

    function send() {
      var text = input.value.trim();
      var media = pendingMedia;
      
      if (!text && !media) return;
      if (!state.conversationId) return;
      
      input.value = '';
      pendingMedia = null;
      updatePendingPreview();

      // Build message content with media info
      var messageContent = text;
      var messageData = { content: text, sender_type: 'contact' };
      
      if (media) {
        messageData.media_url = media.url;
        messageData.media_type = media.type;
        messageData.media_filename = media.filename;
        if (!text) {
          messageContent = '[' + (media.type === 'image' ? 'Image' : 'File') + ': ' + media.filename + ']';
          messageData.content = messageContent;
        }
      }

      state.messages.push(messageData);
      renderMessages();

      api('send', {
        conversation_id: state.conversationId,
        message: messageContent,
        media_url: media ? media.url : null,
        media_type: media ? media.type : null,
        media_filename: media ? media.filename : null
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
    var messagesContainer = document.getElementById('chatflow-messages');
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = state.messages.map(function(m) {
      var mediaHtml = '';
      
      // Check for media in message
      var mediaUrl = m.media_url || (m.metadata && m.metadata.media_url);
      var mediaType = m.media_type || (m.metadata && m.metadata.media_type);
      var mediaFilename = m.media_filename || (m.metadata && m.metadata.media_filename);
      
      if (mediaUrl) {
        if (mediaType === 'image') {
          mediaHtml = '<a href="' + escapeHtml(mediaUrl) + '" target="_blank"><img src="' + escapeHtml(mediaUrl) + '" alt="' + escapeHtml(mediaFilename || 'Image') + '"></a>';
        } else if (mediaType === 'file') {
          mediaHtml = '<a href="' + escapeHtml(mediaUrl) + '" target="_blank" class="file-attachment"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>' + escapeHtml(mediaFilename || 'File') + '</a>';
        }
      }
      
      var contentHtml = m.content ? escapeHtml(m.content) : '';
      // Don't show the placeholder text if we have actual media
      if (mediaHtml && contentHtml.match(/^\[(Image|File):/)) {
        contentHtml = '';
      }
      
      return '<div class="chatflow-message ' + m.sender_type + '">' + mediaHtml + (contentHtml ? '<div>' + contentHtml + '</div>' : '') + '</div>';
    }).join('');
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
