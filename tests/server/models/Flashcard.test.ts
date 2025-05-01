import mongoose, { Error as MongooseError } from 'mongoose';
import Flashcard, { IFlashcard } from '../../../server/src/models/Flashcard';
import * as dbHandler from '../../mocks/mongoose.mock';

describe('Flashcard Model', () => {
  beforeAll(async () => {
    // Connect to the in-memory database
    await dbHandler.connect();
  });

  afterAll(async () => {
    // Disconnect and clean up
    await dbHandler.closeDatabase();
  });

  afterEach(async () => {
    // Clean up after each test
    await dbHandler.clearDatabase();
  });

  it('should create a new flashcard with required fields', async () => {
    const flashcardData = {
      content: 'This is a test flashcard content',
      source: 'https://example.com/test',
    };

    const flashcard = new Flashcard(flashcardData);
    const savedFlashcard = await flashcard.save();

    expect(savedFlashcard._id).toBeDefined();
    expect(savedFlashcard.content).toBe(flashcardData.content);
    expect(savedFlashcard.source).toBe(flashcardData.source);
    expect(savedFlashcard.difficulty).toBe('unknown');
    expect(savedFlashcard.reviewCount).toBe(0);
    expect(savedFlashcard.dateCreated).toBeDefined();
    expect(savedFlashcard.question).toBe('');
  });

  it('should not save a flashcard without required fields', async () => {
    const flashcard = new Flashcard({
      // Missing required content and source
    });

    let error: any = null;
    try {
      await flashcard.save();
    } catch (e) {
      error = e as MongooseError.ValidationError;
    }

    expect(error).toBeDefined();
    expect(error.errors.content).toBeDefined();
    expect(error.errors.source).toBeDefined();
  });

  it('should only accept valid difficulty values', async () => {
    const flashcard = new Flashcard({
      content: 'Test content',
      source: 'https://example.com',
      difficulty: 'invalid-value' // Invalid enum value
    });

    let error: any = null;
    try {
      await flashcard.save();
    } catch (e) {
      error = e as MongooseError.ValidationError;
    }

    expect(error).toBeDefined();
    expect(error.errors.difficulty).toBeDefined();
  });

  it('should update flashcard properties correctly', async () => {
    // Create a flashcard
    const flashcard = new Flashcard({
      content: 'Initial content',
      source: 'https://example.com',
    });
    await flashcard.save();

    // Update the flashcard
    flashcard.question = 'Updated question';
    flashcard.difficulty = 'easy';
    flashcard.reviewCount = 5;
    flashcard.lastReviewed = new Date();
    
    const updatedFlashcard = await flashcard.save();

    // Verify updates
    expect(updatedFlashcard.question).toBe('Updated question');
    expect(updatedFlashcard.difficulty).toBe('easy');
    expect(updatedFlashcard.reviewCount).toBe(5);
    expect(updatedFlashcard.lastReviewed).toBeDefined();
  });
}); 