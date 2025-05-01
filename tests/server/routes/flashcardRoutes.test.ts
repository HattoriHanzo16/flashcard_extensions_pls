import mongoose from 'mongoose';
import request from 'supertest';
import express, { Application } from 'express';
import cors from 'cors';
import winston from 'winston';
import flashcardRoutes from '../../../server/src/routes/flashcardRoutes';
import Flashcard from '../../../server/src/models/Flashcard';
import * as dbHandler from '../../mocks/mongoose.mock';

describe('Flashcard Routes Integration Tests', () => {
  let app: Application;
  let logger: winston.Logger;

  beforeAll(async () => {
    // Setup a test MongoDB connection
    await dbHandler.connect();

    // Setup test Express app
    app = express();
    
    // Setup mock logger
    logger = winston.createLogger({
      level: 'info',
      transports: [new winston.transports.Console()]
    });
    
    app.set('logger', logger);
    
    app.use(cors());
    app.use(express.json());
    app.use('/api/flashcards', flashcardRoutes);
  });

  afterAll(async () => {
    await dbHandler.closeDatabase();
  });

  beforeEach(async () => {
    // Clean up the database before each test
    await dbHandler.clearDatabase();
  });

  describe('POST /', () => {
    it('should create a new flashcard', async () => {
      const response = await request(app)
        .post('/api/flashcards')
        .send({
          content: 'Test flashcard content',
          source: 'https://example.com/test',
          question: 'Test question'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.content).toBe('Test flashcard content');
      expect(response.body.source).toBe('https://example.com/test');
      expect(response.body.question).toBe('Test question');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/flashcards')
        .send({
          question: 'Test question'
          // Missing required fields: content, source
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('required');
    });
  });

  describe('GET /', () => {
    it('should return all flashcards', async () => {
      // Create test flashcards
      await Flashcard.create([
        { content: 'Test content 1', source: 'https://example.com/1' },
        { content: 'Test content 2', source: 'https://example.com/2' }
      ]);

      const response = await request(app).get('/api/flashcards');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it('should return an empty array when no flashcards exist', async () => {
      const response = await request(app).get('/api/flashcards');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('PATCH /:id/review', () => {
    it('should update flashcard review data', async () => {
      // Create a test flashcard
      const flashcard = await Flashcard.create({
        content: 'Test content',
        source: 'https://example.com'
      });

      const response = await request(app)
        .patch(`/api/flashcards/${flashcard._id}/review`)
        .send({
          difficulty: 'hard',
          reviewCount: 3
        });

      expect(response.status).toBe(200);
      expect(response.body.difficulty).toBe('hard');
      expect(response.body.reviewCount).toBe(3);
      expect(response.body.lastReviewed).toBeDefined();
    });

    it('should return 404 if flashcard is not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .patch(`/api/flashcards/${nonExistentId}/review`)
        .send({
          difficulty: 'easy'
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('DELETE /:id', () => {
    it('should delete a specific flashcard', async () => {
      // Create a test flashcard
      const flashcard = await Flashcard.create({
        content: 'Test content',
        source: 'https://example.com'
      });

      const response = await request(app)
        .delete(`/api/flashcards/${flashcard._id}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted successfully');

      // Verify the flashcard was deleted
      const count = await Flashcard.countDocuments();
      expect(count).toBe(0);
    });

    it('should return 404 if trying to delete a non-existent flashcard', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .delete(`/api/flashcards/${nonExistentId}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('DELETE /', () => {
    it('should delete all flashcards', async () => {
      // Create test flashcards
      await Flashcard.create([
        { content: 'Test content 1', source: 'https://example.com/1' },
        { content: 'Test content 2', source: 'https://example.com/2' },
        { content: 'Test content 3', source: 'https://example.com/3' }
      ]);

      const response = await request(app).delete('/api/flashcards');

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted successfully');
      expect(response.body.deleted).toBe(3);

      // Verify all flashcards were deleted
      const count = await Flashcard.countDocuments();
      expect(count).toBe(0);
    });
  });
}); 