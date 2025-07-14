// 🚫 Redirect if not logged in
if (!localStorage.getItem('token')) {
  window.location.href = 'login.html';
}

const chatBox = document.getElementById("chatBox");
const chatList = document.getElementById("chatList");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const newChatBtn = document.getElementById("newChatBtn");
const logoutBtn = document.getElementById("logoutBtn"); // ✅ added
const chatTitle = document.getElementById("chatTitle"); // ✅ added
let currentChatId = null;

// Add message to chat
function addMessage(content, sender = 'user') {
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${sender}`;
  msgDiv.innerText = content;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Typing indicator
function addTypingIndicator() {
  const typing = document.createElement("div");
  typing.id = "typing";
  typing.className = "message ai";
  typing.innerText = "Typing...";
  chatBox.appendChild(typing);
  chatBox.scrollTop = chatBox.scrollHeight;
}
function removeTypingIndicator() {
  const typing = document.getElementById("typing");
  if (typing) typing.remove();
}

// Send message
async function sendMessage() {
  const message = input.value.trim();
  if (!message) return;

  if (!currentChatId) {
    currentChatId = "chat-" + Date.now();
    await loadChatList();
  }

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

    await saveToDB(message, "user");
    await saveToDB(fullText.trim(), "ai");
  } catch (err) {
    removeTypingIndicator();
    addMessage("❌ Error: " + err.message, "error");
  }
}

// Save to DB
async function saveToDB(message, role) {
  await fetch("http://localhost:3000/api/chat/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify({ chat_id: currentChatId, role, message })
  });
}

// Load all chat list
async function loadChatList() {
  const res = await fetch("http://localhost:3000/api/chat/list", {
    headers: { Authorization: "Bearer " + localStorage.getItem("token") }
  });
  const chats = await res.json();
  chatList.innerHTML = "";
  chats.forEach((id) => {
    const li = document.createElement("li");
    li.textContent = id;
    li.addEventListener("click", () => loadChatById(id));

    // Extra buttons
    const renameBtn = document.createElement("button");
    renameBtn.textContent = "✏️";
    renameBtn.onclick = (e) => {
      e.stopPropagation();
      const newName = prompt("Enter new name:", id);
      if (newName && newName !== id) renameChat(id, newName);
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.onclick = async (e) => {
      e.stopPropagation();
      if (confirm("Delete this chat?")) {
        await deleteChat(id);
        loadChatList();
      }
    };

    const exportBtn = document.createElement("button");
    exportBtn.textContent = "📤";
    exportBtn.onclick = async (e) => {
      e.stopPropagation();
      await exportChat(id);
    };

    li.appendChild(renameBtn);
    li.appendChild(deleteBtn);
    li.appendChild(exportBtn);

    chatList.appendChild(li);
  });
}

// Load messages by ID
async function loadChatById(chatId) {
  currentChatId = chatId;
  chatBox.innerHTML = "";
  chatTitle.innerText = `Immorix AI – ${chatId}`;
  const res = await fetch(`http://localhost:3000/api/chat/${chatId}`, {
    headers: { Authorization: "Bearer " + localStorage.getItem("token") }
  });
  const messages = await res.json();
  messages.forEach((msg) => {
    addMessage(msg.message, msg.role);
  });
}

// Rename Chat
async function renameChat(oldId, newId) {
  await fetch("http://localhost:3000/api/chat/rename", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({ oldId, newId })
  });
  if (currentChatId === oldId) currentChatId = newId;
  loadChatList();
}

// Delete Chat
async function deleteChat(chatId) {
  await fetch(`http://localhost:3000/api/chat/delete/${chatId}`, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token")
    }
  });
  if (currentChatId === chatId) currentChatId = null;
  chatBox.innerHTML = "";
}

// Export Chat
async function exportChat(chatId) {
  const res = await fetch(`http://localhost:3000/api/chat/${chatId}`, {
    headers: { Authorization: "Bearer " + localStorage.getItem("token") }
  });
  const messages = await res.json();
  const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${chatId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Input Events
input.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
sendBtn.addEventListener("click", sendMessage);
newChatBtn.addEventListener("click", () => {
  currentChatId = null;
  chatBox.innerHTML = "";
  input.value = "";
  chatTitle.innerText = "Immorix AI";
});
logoutBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("token");
    window.location.href = "login.html";
  }
});

// 🎤 Voice Input
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

// 🌐 PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('✅ Service Worker Registered'))
    .catch(err => console.error('❌ SW Error:', err));
}

// 🌓 Theme Toggle
function toggleTheme() {
  document.body.classList.toggle("light-mode");
}

// Load chat list on start
window.addEventListener("DOMContentLoaded", () => {
  loadChatList();
});
const translations = {
  en: {
    send: "Send",
    placeholder: "Type your message...",
    newChat: "🆕 New Chat",
    logout: "🚪 Logout",
    title: "Immorix AI",
    reset: "Reset Password",
  },
  hi: {
    send: "भेजें",
    placeholder: "अपना संदेश टाइप करें...",
    newChat: "🆕 नई बातचीत",
    logout: "🚪 लॉग आउट",
    title: "इमोरिक्स एआई",
    reset: "पासवर्ड रीसेट करें",
  }
};

let currentLang = localStorage.getItem("lang") || "en";

function applyLang() {
  document.getElementById("sendBtn").innerText = translations[currentLang].send;
  document.getElementById("userInput").placeholder = translations[currentLang].placeholder;
  document.getElementById("newChatBtn").innerText = translations[currentLang].newChat;
  document.getElementById("logoutBtn").innerText = translations[currentLang].logout;
  document.getElementById("chatTitle").innerText = translations[currentLang].title;
}

document.getElementById("langToggleBtn").addEventListener("click", () => {
  currentLang = currentLang === "en" ? "hi" : "en";
  localStorage.setItem("lang", currentLang);
  applyLang();
});

window.addEventListener("DOMContentLoaded", applyLang);
// 🌐 PWA Install Registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('✅ Service Worker Registered'))
    .catch(err => console.error('❌ SW Error:', err));
}
