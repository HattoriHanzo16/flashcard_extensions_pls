import { Request, Response } from 'express';
import Flashcard, { IFlashcard } from '../models/Flashcard';
import logger from '../utils/logger';

export const createFlashcard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { question, content, source, dateCreated } = req.body;

    if (!content || !source) {
      res.status(400).json({ message: 'Content and source are required' });
      return;
    }

    const flashcardData: Partial<IFlashcard> = {
      question: question || '',
      content,
      source
    };
    if (dateCreated) {
      flashcardData.dateCreated = new Date(dateCreated);
    }

    const flashcard = new Flashcard(flashcardData);
    const savedFlashcard = await flashcard.save();
    res.status(201).json(savedFlashcard);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getFlashcards = async (req: Request, res: Response): Promise<void> => {
  try {
    const flashcards = await Flashcard.find({});
    res.status(200).json(flashcards);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const updateFlashcardReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { difficulty, lastReviewed, reviewCount } = req.body;
    
    if (!difficulty || !['easy', 'hard', 'unknown'].includes(difficulty)) {
      res.status(400).json({ message: 'Valid difficulty (easy, hard, unknown) is required' });
      return;
    }
    
    const flashcard = await Flashcard.findById(id);
    
    if (!flashcard) {
      res.status(404).json({ message: 'Flashcard not found' });
      return;
    }
    
    flashcard.lastReviewed = lastReviewed ? new Date(lastReviewed) : new Date();
    flashcard.reviewCount = reviewCount !== undefined ? reviewCount : flashcard.reviewCount + 1;
    flashcard.difficulty = difficulty as 'easy' | 'hard' | 'unknown';
    
    const updatedFlashcard = await flashcard.save();
    res.status(200).json(updatedFlashcard);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const deleteFlashcards = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await Flashcard.deleteMany({});
    res.status(200).json({ message: 'Flashcards deleted successfully', deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const deleteFlashcard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({ message: 'Flashcard ID is required' });
      return;
    }
    
    const result = await Flashcard.findByIdAndDelete(id);
    
    if (!result) {
      res.status(404).json({ message: 'Flashcard not found' });
      return;
    }
    
    res.status(200).json({ message: 'Flashcard deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};