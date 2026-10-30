import { Collection, MongoClient, ServerApiVersion } from "mongodb";
import { Book, Borrow } from "./types";

let booksCollection: Collection<Book> | null = null;
let borrowsCollection: Collection<Borrow> | null = null;

export async function connectDB(): Promise<void> {
  const uri: string | undefined = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is missing in .env");
  }

  const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, deprecationErrors: true },
  });

  await client.connect();
  const db = client.db("booknook");
  await db.command({ ping: 1 });

  booksCollection = db.collection<Book>("books");
  borrowsCollection = db.collection<Borrow>("borrows");

  await booksCollection.createIndex({ createdAt: -1 });
  await borrowsCollection.createIndex({ userEmail: 1, bookId: 1 });

  console.log("MongoDB connected");
}

export function getBooksCollection(): Collection<Book> {
  if (!booksCollection) {
    throw new Error("Database is not connected");
  }
  return booksCollection;
}

export function getBorrowsCollection(): Collection<Borrow> {
  if (!borrowsCollection) {
    throw new Error("Database is not connected");
  }
  return borrowsCollection;
}
