import mongoose from 'mongoose';
import config from '../config/index.js';

/**
 * Connect to MongoDB with retry logic
 * @param {number} maxRetries - Maximum number of connection attempts
 * @param {number} retryDelay - Delay between retries in ms
 */
async function connectDB(maxRetries = 5, retryDelay = 5000) {
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      await mongoose.connect(config.mongoUri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      console.log('✅ MongoDB connected successfully');

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
      });

      return mongoose.connection;
    } catch (error) {
      attempts++;
      console.error(
        `❌ MongoDB connection attempt ${attempts}/${maxRetries} failed:`,
        error.message
      );

      if (attempts >= maxRetries) {
        throw new Error('Failed to connect to MongoDB after maximum retries');
      }

      console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

/**
 * Gracefully disconnect from MongoDB
 */
async function disconnectDB() {
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB disconnected gracefully');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
  }
}

export { connectDB, disconnectDB };
