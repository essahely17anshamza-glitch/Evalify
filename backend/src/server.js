import app from './app.js';
import { PrismaClient } from '@prisma/client';
import http from 'http';
import notificationService from './services/notificationService.js';

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log('Connected to MySQL database via Prisma');
    
    const server = http.createServer(app);
    notificationService.initialize(server);
    
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
