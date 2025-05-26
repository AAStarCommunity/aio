import mongoose from 'mongoose';
import config from '../config';
import logger from './logger';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(config.mongodb.uri);
    logger.info('Successfully connected to MongoDB.');

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected.');
    });

  } catch (error) {
    logger.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
} 