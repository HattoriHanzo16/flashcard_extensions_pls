import mongoose, { Document, Schema } from 'mongoose';

export interface IFlashcard extends Document {
  question: string;
  content: string;
  source: string;
  dateCreated: Date;
  lastReviewed?: Date;
  reviewCount: number;
  difficulty: 'easy' | 'hard' | 'unknown';
}

const FlashcardSchema: Schema = new Schema({
  question: { type: String, default: '' },
  content: { type: String, required: true },
  source: { type: String, required: true },
  dateCreated: { type: Date, default: Date.now },
  lastReviewed: { type: Date },
  reviewCount: { type: Number, default: 0 },
  difficulty: { 
    type: String, 
    enum: ['easy', 'hard', 'unknown'], 
    default: 'unknown' 
  }
});

export default mongoose.model<IFlashcard>('Flashcard', FlashcardSchema); 