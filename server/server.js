const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const prisma = require('./src/lib/prisma');

dotenv.config();

const app = express();
let server;
let isShuttingDown = false;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database Connection (MySQL via Prisma)
const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('✅ MySQL Connected (Prisma)');
  } catch (err) {
    console.error('❌ MySQL Connection Failed:', err.message);
    process.exit(1);
  }
};

// Static file serving for uploaded documents
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/superadmin', require('./routes/superadmin'));
app.use('/api/schooladmin', require('./routes/schooladmin'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/parent', require('./routes/parent'));
app.use('/api/students', require('./routes/students'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/reports', require('./routes/reports'));

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'Server is running', db: 'mysql', timestamp: new Date() });
  } catch (err) {
    res.status(500).json({ status: 'Server is running', db: 'mysql_disconnected', error: err.message, timestamp: new Date() });
  }
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

const shutdown = async (signal, exitCode = 0) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  } catch (err) {
    console.error('Error while closing HTTP server:', err.message);
  }

  try {
    await prisma.$disconnect();
  } catch (err) {
    console.error('Error while disconnecting Prisma:', err.message);
  }

  if (signal === 'SIGUSR2') {
    process.kill(process.pid, 'SIGUSR2');
    return;
  }

  process.exit(exitCode);
};

const startServer = async () => {
  await connectDB();
  const PORT = process.env.PORT || 5000;

  server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });

  server.on('error', async (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Stop the other server process or change PORT.`);
      await shutdown(null, 1);
      return;
    }

    console.error('❌ Server startup failed:', err.message);
    await shutdown(null, 1);
  });
};

process.once('SIGINT', () => {
  shutdown('SIGINT', 0);
});

process.once('SIGTERM', () => {
  shutdown('SIGTERM', 0);
});

process.once('SIGUSR2', () => {
  shutdown('SIGUSR2', 0);
});

startServer();
