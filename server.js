const express = require('express');
const app = express();
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');
const ACTIONS = require('./src/Actions');

const server = http.createServer(app);
const io = new Server(server);

const userSocketMap = {};


const roomState = {};

// ── Helpers ────────────────────────────────────────────────────────────────

function getAllConnectedClients(roomId) {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => ({ socketId, username: userSocketMap[socketId] })
  );
}

function getLanguageFromExtension(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    js:   'JavaScript',
    ts:   'TypeScript',
    py:   'Python',
    java: 'Java',
    c:    'C',
    cpp:  'C++',
    html: 'HTML',
    css:  'CSS',
    json: 'JSON',
    md:   'Markdown',
    sql:  'SQL',
  };
  return map[ext] || 'JavaScript';
}

function createDefaultRoom() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    files: {
      'main.js': {
        language:  'JavaScript',
        content:   '// Welcome to the collaborative editor!\nconsole.log("Hello World");',
        createdAt: today,
      },
    },
    activeFile: 'main.js',
  };
}

// ── Socket.IO ──────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  // ── Room join ──────────────────────────────────────────────────────────
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);

    // Initialise room state on first join
    if (!roomState[roomId]) {
      roomState[roomId] = createDefaultRoom();
    }

    const clients = getAllConnectedClients(roomId);

    // Notify every client (including new joiner) that the user list changed
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });

    // System chat notice
    io.in(roomId).emit(ACTIONS.CHAT_SYSTEM, {
      text:      `${username} joined the chat`,
      timestamp: new Date().toISOString(),
    });

    // Send the entire file workspace to the new joiner
    io.to(socket.id).emit(ACTIONS.SYNC_FILES, {
      files:      roomState[roomId].files,
      activeFile: roomState[roomId].activeFile,
    });
  });

  // ── File content change (per-file code sync) ───────────────────────────
  socket.on(ACTIONS.FILE_CONTENT_CHANGE, ({ roomId, filename, content }) => {
    if (!roomId || !filename) return;
    if (!roomState[roomId]) roomState[roomId] = createDefaultRoom();

    if (roomState[roomId].files[filename]) {
      // Use a timestamp-based last-write-wins strategy to avoid race conditions:
      // the server always accepts the latest write and broadcasts it.
      // For production, consider OT or CRDT (e.g. Yjs / ShareDB).
      roomState[roomId].files[filename].content = content;
    }

    // Broadcast to everyone else in the room (not the sender)
    socket.in(roomId).emit(ACTIONS.FILE_CONTENT_CHANGE, { filename, content });
  });

  // ── Create file ────────────────────────────────────────────────────────
  socket.on(ACTIONS.CREATE_FILE, ({ roomId, filename }) => {
    if (!roomId || !filename) return;
    if (!roomState[roomId]) roomState[roomId] = createDefaultRoom();

    // Prevent duplicate file names
    if (roomState[roomId].files[filename]) {
      io.to(socket.id).emit('error-event', {
        message: `File "${filename}" already exists.`,
      });
      return;
    }

    const newFile = {
      language:  getLanguageFromExtension(filename),
      content:   '',
      createdAt: new Date().toISOString().slice(0, 10),
    };

    roomState[roomId].files[filename] = newFile;
    roomState[roomId].activeFile = filename;

    // Tell everyone (including sender) about the new file
    io.in(roomId).emit(ACTIONS.CREATE_FILE, {
      filename,
      file:       newFile,
      activeFile: filename,
    });
  });

  // ── Delete file ────────────────────────────────────────────────────────
  socket.on(ACTIONS.DELETE_FILE, ({ roomId, filename }) => {
    if (!roomId || !filename) return;
    if (!roomState[roomId]) return;

    const fileList = Object.keys(roomState[roomId].files);
    if (fileList.length <= 1) {
      io.to(socket.id).emit('error-event', {
        message: 'Cannot delete the last file.',
      });
      return;
    }

    delete roomState[roomId].files[filename];

    // If the deleted file was active, switch to the first remaining file
    let newActive = roomState[roomId].activeFile;
    if (newActive === filename) {
      newActive = Object.keys(roomState[roomId].files)[0];
      roomState[roomId].activeFile = newActive;
    }

    io.in(roomId).emit(ACTIONS.DELETE_FILE, { filename, newActive });
  });

  // ── Rename file ────────────────────────────────────────────────────────
  socket.on(ACTIONS.RENAME_FILE, ({ roomId, oldName, newName }) => {
    if (!roomId || !oldName || !newName) return;
    if (!roomState[roomId]) return;
    if (roomState[roomId].files[newName]) {
      io.to(socket.id).emit('error-event', {
        message: `File "${newName}" already exists.`,
      });
      return;
    }

    const fileData = roomState[roomId].files[oldName];
    if (!fileData) return;

    // Transfer content and update language based on new extension
    roomState[roomId].files[newName] = {
      ...fileData,
      language: getLanguageFromExtension(newName),
    };
    delete roomState[roomId].files[oldName];

    if (roomState[roomId].activeFile === oldName) {
      roomState[roomId].activeFile = newName;
    }

    io.in(roomId).emit(ACTIONS.RENAME_FILE, {
      oldName,
      newName,
      newLanguage: roomState[roomId].files[newName].language,
      activeFile:  roomState[roomId].activeFile,
    });
  });

  // ── Switch active file (user switches tabs – not broadcast to others) ──
  // Each user tracks their own active file on the client side after initial
  // sync. We only need to update server state for the room if desired.
  // Here we just acknowledge; the client handles local switching.
  socket.on(ACTIONS.SWITCH_FILE, ({ roomId, filename }) => {
    if (roomState[roomId]) {
      roomState[roomId].activeFile = filename;
    }
    // Optionally broadcast so all users switch together (commented out –
    // per requirements, file switching is personal):
    // socket.in(roomId).emit(ACTIONS.SWITCH_FILE, { filename });
  });

  // ── Legacy language change (kept for backward compat) ─────────────────
  socket.on(ACTIONS.LANGUAGE_CHANGE, ({ roomId, language }) => {
    socket.in(roomId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
  });

  // ── Chat relay ─────────────────────────────────────────────────────────
  socket.on(ACTIONS.CHAT_MESSAGE, ({ roomId, message }) => {
    socket.in(roomId).emit(ACTIONS.CHAT_MESSAGE, { message });
  });

  // ── Disconnect ─────────────────────────────────────────────────────────
  socket.on('disconnecting', () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      const username = userSocketMap[socket.id];

      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username,
      });

      socket.in(roomId).emit(ACTIONS.CHAT_SYSTEM, {
        text:      `${username} left the chat`,
        timestamp: new Date().toISOString(),
      });

      // Clean up room state when the last user leaves
      const remaining = getAllConnectedClients(roomId).filter(
        (c) => c.socketId !== socket.id
      );
      if (remaining.length === 0) {
        delete roomState[roomId];
      }
    });

    delete userSocketMap[socket.id];
  });
});

// ── Static build serving ───────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'build')));
app.get('/{*path}', (_, res) =>
  res.sendFile(path.join(__dirname, 'build', 'index.html'))
);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
