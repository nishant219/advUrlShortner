import mongoose from 'mongoose';
import { IURL } from '../types';

const urlSchema = new mongoose.Schema<IURL>({
    userId: {
        type: String,
        required: true,
        ref: 'User'
      },
      longUrl: {
        type: String,
        required: true
      },
      shortUrl: {
        type: String,
        required: true
      },
      alias: {
        type: String,
        required: true,
        unique: true
      },
      topic: {
        type: String,
        required: false
      },
      clicks: {
        type: Number,
        default: 0
      },
      active: {
        type: Boolean,
        default: true
      }
},{
    timestamps: true
})

urlSchema.index({ userId: 1, topic: 1 });
urlSchema.index({ alias: 1 }, { unique: true });    

export const URL = mongoose.model<IURL>('URL', urlSchema);