import mongoose from 'mongoose';
import { IAnalytics } from '../types';

const analyticsSchema = new mongoose.Schema<IAnalytics>({
  urlId: {
    type: String,
    required: true,
    ref: 'URL'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  userAgent: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  geoLocation: {
    country: String,
    city: String,
    latitude: Number,
    longitude: Number
  },
  osType: {
    type: String,
    required: true
  },
  deviceType: {
    type: String,
    required: true
  },
  uniqueVisitorId: {
    type: String,
    required: true
  }
});

analyticsSchema.index({ urlId: 1, timestamp: -1 });
analyticsSchema.index({ urlId: 1, uniqueVisitorId: 1 });

export const Analytics = mongoose.model<IAnalytics>('Analytics', analyticsSchema);