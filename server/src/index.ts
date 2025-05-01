import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import flashcardRoutes from './routes/flashcardRoutes';
import fs from 'fs';
import http from 'http';
import path from 'path';
import logger from './utils/logger';

dotenv.config();

connectDB();

const app = express();
app.set('logger', logger);

app.use((req, res, next) => {
  logger.info('Incoming request: %s %s', req.method, req.originalUrl);
  next();
});

const HTTP_PORT = process.env.PORT || 3001;

const corsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());

app.options('*', cors(corsOptions)); 

app.use('/flashcards', flashcardRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/ping', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    time: new Date().toISOString(),
    message: 'Server is running and reachable'
  });
});

const httpServer = http.createServer(app);

httpServer.listen(HTTP_PORT, () => {
  logger.info(`HTTP Server running on port ${HTTP_PORT}`);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception: %o', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection: %o', reason);
});