import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Suppress deprecation warnings
mongoose.set('strictQuery', false);

// Setup in-memory MongoDB server for testing
let mongoServer: MongoMemoryServer;

/**
 * Connect to the in-memory database.
 */
export const connect = async (): Promise<void> => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  const mongooseOpts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };
  
  await mongoose.connect(uri);
};

/**
 * Drop database, close the connection and stop mongod.
 */
export const closeDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  
  if (mongoServer) {
    await mongoServer.stop();
  }
};

/**
 * Remove all the data for all db collections.
 */
export const clearDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState) {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
}; 