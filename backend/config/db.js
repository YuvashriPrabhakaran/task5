import mongoose from 'mongoose';

/**
 * MongoDB connection helper.
 * Connects to MongoDB using Mongoose. If MONGODB_URI is not provided
 * or if connection fails, it falls back to a local JSON file-based database
 * so the application remains 100% functional out-of-the-box in the preview.
 */
class Database {
  constructor() {
    this.isConnected = false;
    this.isFallback = false;
  }

  async connect() {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      console.warn('⚠️ MONGODB_URI is not defined in the environment variables.');
      console.warn('ℹ️ Running in Fallback Mode using a secure JSON file-based database.');
      this.isFallback = true;
      this.isConnected = true;
      return { isConnected: true, isFallback: true };
    }

    try {
      // Configure Mongoose options for stable connection
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
      });

      this.isConnected = true;
      this.isFallback = false;
      console.log(`🔌 MongoDB Connected Successfully: ${conn.connection.host}`);
      return { isConnected: true, isFallback: false };
    } catch (error) {
      console.error(`❌ MongoDB Connection Error: ${error.message}`);
      console.warn('ℹ️ Falling back to local JSON file-based database so the server does not crash.');
      this.isFallback = true;
      this.isConnected = true;
      return { isConnected: true, isFallback: true };
    }
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      mode: this.isFallback ? 'File-Based Persistent Storage' : 'MongoDB / Mongoose Connection',
    };
  }
}

const dbInstance = new Database();
export default dbInstance;
