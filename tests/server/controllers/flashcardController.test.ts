import { Request, Response } from 'express';
import mongoose from 'mongoose';
import * as flashcardController from '../../../server/src/controllers/flashcardController';
import Flashcard from '../../../server/src/models/Flashcard';
import * as dbHandler from '../../mocks/mongoose.mock';

// Mock the logger
jest.mock('../../../server/src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('Flashcard Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any = {};

  beforeAll(async () => {
    await dbHandler.connect();
  });

  afterAll(async () => {
    await dbHandler.closeDatabase();
  });

  beforeEach(() => {
    // Reset the response object
    responseObject = {};
    
    // Setup mock request and response
    mockRequest = {
      body: {},
      params: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation(result => {
        responseObject = result;
        return mockResponse;
      })
    };
  });

  afterEach(async () => {
    await dbHandler.clearDatabase();
    jest.clearAllMocks();
  });

  describe('createFlashcard', () => {
    it('should create a new flashcard successfully', async () => {
      mockRequest.body = {
        content: 'Test content',
        source: 'https://example.com',
        question: 'Test question'
      };

      await flashcardController.createFlashcard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(responseObject).toHaveProperty('_id');
      expect(responseObject.content).toBe('Test content');
      expect(responseObject.source).toBe('https://example.com');
      expect(responseObject.question).toBe('Test question');
      expect(responseObject.difficulty).toBe('unknown');
      expect(responseObject.reviewCount).toBe(0);
    });

    it('should return 400 if required fields are missing', async () => {
      mockRequest.body = {
        // Missing required fields
      };

      await flashcardController.createFlashcard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseObject).toHaveProperty('message');
      expect(responseObject.message).toContain('required');
    });
  });

  describe('getFlashcards', () => {
    it('should return all flashcards', async () => {
      // Create some test flashcards
      await Flashcard.create([
        { content: 'Test content 1', source: 'https://example.com/1' },
        { content: 'Test content 2', source: 'https://example.com/2' }
      ]);

      await flashcardController.getFlashcards(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(Array.isArray(responseObject)).toBe(true);
      expect(responseObject.length).toBe(2);
    });
  });

  describe('updateFlashcardReview', () => {
    it('should update flashcard review data', async () => {
      // Create a test flashcard
      const flashcard = await Flashcard.create({
        content: 'Test content',
        source: 'https://example.com'
      });

      mockRequest.params = { id: flashcard._id.toString() };
      mockRequest.body = {
        difficulty: 'easy',
        reviewCount: 1
      };

      await flashcardController.updateFlashcardReview(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject.difficulty).toBe('easy');
      expect(responseObject.reviewCount).toBe(1);
      expect(responseObject.lastReviewed).toBeDefined();
    });

    it('should return 404 if flashcard not found', async () => {
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };
      mockRequest.body = { difficulty: 'easy' };

      await flashcardController.updateFlashcardReview(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseObject.message).toContain('not found');
    });

    it('should return 400 if difficulty is invalid', async () => {
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };
      mockRequest.body = { difficulty: 'invalid-value' };

      await flashcardController.updateFlashcardReview(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseObject.message).toContain('difficulty');
    });
  });

  describe('deleteFlashcard', () => {
    it('should delete a flashcard by id', async () => {
      // Create a test flashcard
      const flashcard = await Flashcard.create({
        content: 'Test content',
        source: 'https://example.com'
      });

      mockRequest.params = { id: flashcard._id.toString() };

      await flashcardController.deleteFlashcard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject.message).toContain('deleted successfully');

      // Verify flashcard is deleted
      const deletedFlashcard = await Flashcard.findById(flashcard._id);
      expect(deletedFlashcard).toBeNull();
    });

    it('should return 404 if flashcard not found', async () => {
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };

      await flashcardController.deleteFlashcard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseObject.message).toContain('not found');
    });
  });

  describe('deleteFlashcards', () => {
    it('should delete all flashcards', async () => {
      // Create some test flashcards
      await Flashcard.create([
        { content: 'Test content 1', source: 'https://example.com/1' },
        { content: 'Test content 2', source: 'https://example.com/2' }
      ]);

      await flashcardController.deleteFlashcards(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject.message).toContain('deleted successfully');
      expect(responseObject.deleted).toBe(2);

      // Verify all flashcards are deleted
      const count = await Flashcard.countDocuments();
      expect(count).toBe(0);
    });
  });
}); 