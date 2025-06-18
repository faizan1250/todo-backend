
//   const express = require('express');
// const mongoose = require('mongoose');
// const dotenv = require('dotenv');
// const authMiddleware = require('./middleware/authMiddleware');


// const authRoutes = require('./routes/authRoutes');

// const friendsRouter = require('./routes/friends');
// const challengeRoutes = require('./routes/challengeRoutes');
// const cors = require('cors');


// const http = require('http');
// const { Server } = require('socket.io');

// dotenv.config();

// console.log('Cloud name:', process.env.CLOUDINARY_CLOUD_NAME);
// console.log('API key:', process.env.CLOUDINARY_API_KEY);
// console.log('API secret:', process.env.CLOUDINARY_API_SECRET);
// const userRoutes = require('./routes/userRoutes');
// const app = express();
// app.use(express.json());
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: '*',
//     methods: ['GET', 'POST']
//   }
// });

// const onlineUsers = new Map(); // userId -> { socketId, status }
// const allowedStatuses = ['Online', 'Idle', 'In Challenge'];

// io.on('connection', (socket) => {
//   console.log('🔌 A user connected:', socket.id);

//   socket.on('go-online', (userId) => {
//     onlineUsers.set(userId, { socketId: socket.id, status: 'Online' });
//     console.log(`✅ ${userId} is Online`);
//     broadcastPresence();
//   });

//   socket.on('status-update', ({ userId, status }) => {
//     if (!allowedStatuses.includes(status)) return;

//     if (onlineUsers.has(userId)) {
//       onlineUsers.set(userId, { socketId: socket.id, status });
//       console.log(`🔄 ${userId} updated status to ${status}`);
//       broadcastPresence();
//     }
//   });

//   socket.on('go-offline', (userId) => {
//     if (onlineUsers.delete(userId)) {
//       console.log(`❌ ${userId} went offline`);
//       broadcastPresence();
//     }
//   });

//   socket.on('disconnect', () => {
//     for (const [userId, data] of onlineUsers.entries()) {
//       if (data.socketId === socket.id) {
//         onlineUsers.delete(userId);
//         console.log(`❌ Disconnected: ${userId}`);
//         break;
//       }
//     }
//     broadcastPresence();
//   });

//   function broadcastPresence() {
//     const presenceList = Array.from(onlineUsers.entries()).map(
//       ([userId, { status }]) => ({ userId, status })
//     );
//     io.emit('presence-update', presenceList);
//   }
// });

// // Middleware


// // Routes
// app.get('/api/test', (req, res) => {
//   res.send('Backend reachable');
// });

// app.get('/api/presence', (req, res) => {
//   const presenceList = Array.from(onlineUsers.entries()).map(
//     ([userId, { status }]) => ({ userId, status })
//   );
//   res.json(presenceList);
// });

// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/friends', authMiddleware, friendsRouter);
// app.use('/api/challenges', authMiddleware, challengeRoutes);

// // DB Connection
// mongoose.connect(process.env.MONGO_URI)
//   .then(() => {
//     console.log('✅ MongoDB connected');
//     server.listen(5000, () => console.log('🚀 Server started on port 5000'));
//   })
//   .catch((err) => console.error(err));


const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const authMiddleware = require('./middleware/authMiddleware');

const authRoutes = require('./routes/authRoutes');
const friendsRouter = require('./routes/friends');
const userRoutes = require('./routes/userRoutes');
const statRoutes = require('./routes/statsRoutes');
const Challenge = require('./models/Challenge');

const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();
const PORT = process.env.PORT || 5000;

console.log('Cloud name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API key:', process.env.CLOUDINARY_API_KEY);
console.log('API secret:', process.env.CLOUDINARY_API_SECRET);

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
app.set('io', io);
const onlineUsers = new Map(); // userId -> { socketId, status }
const allowedStatuses = ['Online', 'Idle', 'In Challenge'];

io.on('connection', (socket) => {
  console.log('🔌 A user connected:', socket.id);

  socket.on('go-online', (userId) => {
    onlineUsers.set(userId, { socketId: socket.id, status: 'Online' });
    console.log(`✅ ${userId} is Online`);
    broadcastPresence();
  });

  socket.on('status-update', ({ userId, status }) => {
    if (!allowedStatuses.includes(status)) return;

    if (onlineUsers.has(userId)) {
      onlineUsers.set(userId, { socketId: socket.id, status });
      console.log(`🔄 ${userId} updated status to ${status}`);
      broadcastPresence();
    }
  });

  socket.on('go-offline', (userId) => {
    if (onlineUsers.delete(userId)) {
      console.log(`❌ ${userId} went offline`);
      broadcastPresence();
    }
  });

  socket.on('join-challenge-room', (challengeId) => {
    console.log(`📥 Socket ${socket.id} joined room challenge-${challengeId}`);
    socket.join(`challenge-${challengeId}`);
    console.log(`📥 Socket ${socket.id} joined room challenge-${challengeId}`);
  });


// socket.on('progress-update', async ({ challengeId, userId }) => {
//   try {
//     console.log(`📥 Socket progress-update for challenge: ${challengeId}, user: ${userId}`);

//     const challenge = await Challenge.findById(challengeId);
//     if (!challenge) return;

//     const participant = challenge.participants.find(p => {
//       const pid = typeof p.user === 'object' ? p.user._id?.toString() : p.user?.toString();
//       return pid === userId;
//     });

//     if (!participant || !participant.currentSessionStart) {
//       console.log(`⚠️ No active session for user ${userId}`);
//       return;
//     }

//     const now = new Date();
//     const sessionStart = new Date(participant.currentSessionStart);
//     const elapsedSeconds = Math.floor((now - sessionStart) / 1000);

//     if (!isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
//       console.log(`⏸️ No time to add (elapsed: ${elapsedSeconds}s)`);
//       return;
//     }

//     participant.secondsCompleted += elapsedSeconds;
//     participant.currentSessionStart = now;

//     const totalSeconds = challenge.totalHours * 3600;
//     participant.percentageCompleted = (participant.secondsCompleted / totalSeconds) * 100;
//     participant.pointsEarned = Math.floor((participant.percentageCompleted / 100) * challenge.totalPoints);

//     await challenge.save();
//     await challenge.populate('participants.user', 'name profileColor');

//     console.log(`⏱️ +${elapsedSeconds}s synced via socket for ${userId}`);
//     io.to(`challenge-${challengeId}`).emit('challenge-updated', challenge);
//   } catch (err) {
//     console.error('🔥 Socket error in progress-update:', err);
//   }
// });
socket.on('progress-update', async ({ challengeId, userId }) => {
  try {
    console.log(`📥 Socket progress-update for challenge: ${challengeId}, user: ${userId}`);

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) return;

    const participant = challenge.participants.find(p => {
      const pid = typeof p.user === 'object' ? p.user._id?.toString() : p.user?.toString();
      return pid === userId;
    });

    if (!participant || !participant.currentSessionStart) {
      console.log(`⚠️ No active session for user ${userId}`);
      return;
    }

    const now = new Date();
    const sessionStart = new Date(participant.currentSessionStart);
    const elapsedSeconds = Math.floor((now - sessionStart) / 1000);

    if (!isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
      console.log(`⏸️ No time to add (elapsed: ${elapsedSeconds}s)`);
      return;
    }

    // Update time
    participant.secondsCompleted += elapsedSeconds;
    participant.currentSessionStart = now;

    // Cap values
    const totalSeconds = challenge.totalHours * 3600;
    participant.secondsCompleted = Math.min(participant.secondsCompleted, totalSeconds);
    participant.percentageCompleted = Math.min((participant.secondsCompleted / totalSeconds) * 100, 100);
    participant.pointsEarned = Math.min(
      Math.floor((participant.percentageCompleted / 100) * challenge.totalPoints),
      challenge.totalPoints
    );
    participant.isComplete = participant.secondsCompleted >= totalSeconds;

    await challenge.save();
    await challenge.populate('participants.user', 'name profileColor');

    console.log(`⏱️ +${elapsedSeconds}s synced via socket for ${userId}`);
    io.to(`challenge-${challengeId}`).emit('challenge-updated', challenge);
  } catch (err) {
    console.error('🔥 Socket error in progress-update:', err);
  }
});


  socket.on('leave-challenge-room', (challengeId) => {
    socket.leave(`challenge-${challengeId}`);
    console.log(`📤 Socket ${socket.id} left room challenge-${challengeId}`);
  });

  socket.on('disconnect', () => {
    for (const [userId, data] of onlineUsers.entries()) {
      if (data.socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`❌ Disconnected: ${userId}`);
        break;
      }
    }
    broadcastPresence();
  });

  function broadcastPresence() {
    const presenceList = Array.from(onlineUsers.entries()).map(
      ([userId, { status }]) => ({ userId, status })
    );
    io.emit('presence-update', presenceList);
  }
});

// Middleware

// Routes
app.get('/api/test', (req, res) => {
  res.send('Backend reachable');
});

app.get('/api/presence', (req, res) => {
  const presenceList = Array.from(onlineUsers.entries()).map(
    ([userId, { status }]) => ({ userId, status })
  );
  res.json(presenceList);
});

const challengeRoutes = require('./routes/challengeRoutes')(io); // Pass io instance

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', authMiddleware, friendsRouter);
app.use('/api/challenges', authMiddleware, challengeRoutes);
app.use('/api/stats', authMiddleware, statRoutes )
// DB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, () => console.log('🚀 Server started on port 5000'));
  })
  .catch((err) => console.error(err));
