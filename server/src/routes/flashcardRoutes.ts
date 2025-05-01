import { Router } from 'express';
import { 
  createFlashcard, 
  getFlashcards, 
  updateFlashcardReview,
  deleteFlashcards,
  deleteFlashcard
} from '../controllers/flashcardController';

const router = Router();

router.use((req, res, next) => {
  req.app.get('logger').info('Incoming request: %s %s', req.method, req.originalUrl);
  next();
});

router.post('/', createFlashcard);

router.get('/', getFlashcards);

router.patch('/:id/review', updateFlashcardReview);

router.delete('/', deleteFlashcards);

router.delete('/:id', deleteFlashcard);

export default router;