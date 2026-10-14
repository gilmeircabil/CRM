import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer: MongoMemoryServer | null = null;

export async function connectDB(): Promise<string> {
  const uri = process.env.MONGODB_URI;

  if (uri && !uri.includes('memory')) {
    try {
      console.log(`Attempting connection to MongoDB at: ${uri}`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log('Successfully connected to MongoDB.');
      return uri;
    } catch (err: any) {
      console.warn(`Failed to connect to ${uri}: ${err.message}. Initializing in-memory MongoDB instance...`);
    }
  }

  // Fallback to MongoMemoryServer for standalone zero-config execution
  memoryServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'clientflow',
    },
  });
  const memUri = memoryServer.getUri();
  console.log(`Connected to in-memory MongoDB at: ${memUri}`);
  await mongoose.connect(memUri);
  return memUri;
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
}
