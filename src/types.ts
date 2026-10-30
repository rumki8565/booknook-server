import { ObjectId } from "mongodb";

export type BookCategory =
  | "Fiction"
  | "Science"
  | "History"
  | "Kids"
  | "Others";

export interface Book {
  _id?: ObjectId;
  title: string;
  author: string;
  category: BookCategory;
  image: string;
  description: string;
  totalCopies: number;
  availableCopies: number;
  addedByName: string;
  addedByEmail: string;
  createdAt: Date;
}

export interface Borrow {
  _id?: ObjectId;
  bookId: ObjectId;
  bookTitle: string;
  bookImage: string;
  userName: string;
  userEmail: string;
  borrowDate: Date;
  returnDate: Date;
}
