// ✅ DOM Elements
const chatContainer = document.getElementById("chatContainer");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");

// ✅ Add Message to UI (with typing effect for AI)
function addMessage(content, sender = 'user', isStreaming = false) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${sender}`;
  msgDiv.innerText = sender === 'user' ? content : '';
  chatContainer.appendChild(msgDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  if (sender === 'ai' && isStreaming) {
    let index = 0;
    const interval = setInterval(() => {
      if (index < content.length) {
        msgDiv.innerText += content.charAt(index);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        index++;
      } else {
        clearInterval(interval);
      }
    }, 15);
  } else if (sender === 'ai') {
    msgDiv.innerText = content;
  }
}

// ✅ Show Typing...
function addTypingIndicator() {
  const typing = document.createElement("div");
  typing.id = "typing";
  typing.className = "message ai";
  typing.innerText = "Typing...";
  chatContainer.appendChild(typing);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ✅ Remove Typing...
function removeTypingIndicator() {
  const typing = document.getElementById("typing");
  if (typing) typing.remove();
}

// ✅ Send Message
async function sendMessage() {
  const message = input.value.trim();
  if (!message) return;

  addMessage(message, "user");
  input.value = "";
  addTypingIndicator();

  try {
    const res = await fetch("http://localhost:3000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
    }

    removeTypingIndicator();
    addMessage(fullText.trim(), "ai", true);

  } catch (err) {
    removeTypingIndicator();
    addMessage("❌ Error: " + err.message, "error");
  }
}

// ✅ Enter key to send
input.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
sendBtn.addEventListener("click", sendMessage);

// ✅ Mic / Voice Input (Speech Recognition)
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';

  micBtn.addEventListener('click', () => {
    recognition.start();
    micBtn.innerText = '🎙️ Listening...';
  });

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    input.value = transcript;
    micBtn.innerText = '🎤';
    sendMessage();
  };

  recognition.onerror = () => {
    micBtn.innerText = '🎤';
    alert('❌ Voice recognition error.');
  };

  recognition.onend = () => {
    micBtn.innerText = '🎤';
  };
} else {
  micBtn.disabled = true;
  micBtn.title = '❌ Mic not supported';
}

// ========== 📱 PWA Install Prompt ========== //
let deferredPrompt;
const installBtn = document.createElement('button');
installBtn.innerText = '📲 Install Immorix';
installBtn.style = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #ff6600;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  z-index: 9999;
`;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.body.appendChild(installBtn);
});

installBtn.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      installBtn.remove();
    }
    deferredPrompt = null;
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('service-worker.js')
      .then(reg => console.log('✅ Service Worker Registered'))
      .catch(err => console.error('❌ Service Worker Failed', err));
  });
}
let currentChatId = null;

// Load Chat List
async function loadChatList() {
  const token = localStorage.getItem("token");
  const res = await fetch("http://localhost:3000/api/chat/list", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const chatIds = await res.json();
  const listElem = document.getElementById("chatList");
  listElem.innerHTML = "";
  chatIds.forEach(id => {
    const li = document.createElement("li");
    li.innerText = `🗨️ ${id.slice(0, 6)}...`;
    li.onclick = () => loadChat(id);
    listElem.appendChild(li);
  });
}

// Load Messages
async function loadChat(chatId) {
  currentChatId = chatId;
  const token = localStorage.getItem("token");
  const res = await fetch(`http://localhost:3000/api/chat/${chatId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const msgs = await res.json();
  const container = document.getElementById("chatContainer");
  container.innerHTML = "";
  msgs.forEach(msg => addMessage(msg.message, msg.role));
}

// Modify sendMessage()
async function sendMessage() {
  const message = input.value.trim();
  if (!message) return;

  addMessage(message, "user");
  input.value = "";
  addTypingIndicator();

  try {
    const res = await fetch("http://localhost:3000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      const typingElem = document.getElementById("typing");
      if (typingElem) typingElem.innerText = fullText;
    }

    removeTypingIndicator();
    addMessage(fullText.trim(), "ai");

    // ✅ Save chat
    const chat_id = currentChatId || Date.now().toString();
    currentChatId = chat_id;
    const token = localStorage.getItem("token");
    await fetch("http://localhost:3000/api/chat/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        chat_id,
        role: "user",
        message
      })
    });
    await fetch("http://localhost:3000/api/chat/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        chat_id,
        role: "ai",
        message: fullText.trim()
      })
    });
    loadChatList(); // refresh sidebar

  } catch (err) {
    removeTypingIndicator();
    addMessage("❌ Error: " + err.message, "error");
  }
}

// On Load
window.onload = loadChatList;
