import { Router, Request, Response } from "express";
import { Filter, ObjectId } from "mongodb";
import { getBooksCollection } from "../db";
import { Book, BookCategory } from "../types";
import { handleError, isValidId, sendError } from "../utils";

const router = Router();

const categories: BookCategory[] = [
  "Fiction",
  "Science",
  "History",
  "Kids",
  "Others",
];

interface BookFields {
  title: string;
  author: string;
  category: BookCategory;
  image: string;
  description: string;
  totalCopies: number;
}

function validateBook(body: Record<string, unknown>): BookFields | string {
  const { title, author, category, image, description, totalCopies } = body;

  if (typeof title !== "string" || !title.trim())
    return "Book title is required";
  if (typeof author !== "string" || !author.trim())
    return "Author name is required";
  if (
    typeof category !== "string" ||
    !categories.includes(category as BookCategory)
  ) {
    return "Please choose a valid category";
  }
  if (typeof image !== "string" || !image.trim())
    return "Book image is required";
  if (typeof description !== "string" || !description.trim()) {
    return "Short description is required";
  }

  const copies: number = Number(totalCopies);
  if (!Number.isInteger(copies) || copies < 1) {
    return "Total copies must be a whole number of at least 1";
  }

  return {
    title: title.trim(),
    author: author.trim(),
    category: category as BookCategory,
    image: image.trim(),
    description: description.trim(),
    totalCopies: copies,
  };
}

// GET /books  (public) -> newest first
// ?limit=6 for New Arrivals, ?email=... for My Books
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, limit } = req.query;
    const filter: Filter<Book> = {};

    if (typeof email === "string" && email) {
      filter.addedByEmail = email;
    }

    let cursor = getBooksCollection().find(filter).sort({ createdAt: -1 });

    const max: number = Number(limit);
    if (Number.isInteger(max) && max > 0) {
      cursor = cursor.limit(Math.min(max, 100));
    }

    const books: Book[] = await cursor.toArray();
    res.json(books);
  } catch (error: unknown) {
    handleError(res, error);
  }
});

// GET /books/:id
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id: string = String(req.params.id);
    if (!isValidId(id)) {
      sendError(res, 400, "Invalid book id");
      return;
    }

    const book = await getBooksCollection().findOne({ _id: new ObjectId(id) });
    if (!book) {
      sendError(res, 404, "Book not found");
      return;
    }

    res.json(book);
  } catch (error: unknown) {
    handleError(res, error);
  }
});

// POST /books
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const fields = validateBook(body);
    if (typeof fields === "string") {
      sendError(res, 400, fields);
      return;
    }

    const { addedByName, addedByEmail } = body;
    if (
      typeof addedByName !== "string" ||
      !addedByName.trim() ||
      typeof addedByEmail !== "string" ||
      !addedByEmail.trim()
    ) {
      sendError(res, 400, "User name and email are required");
      return;
    }

    const newBook: Book = {
      ...fields,
      availableCopies: fields.totalCopies,
      addedByName: addedByName.trim(),
      addedByEmail: addedByEmail.trim(),
      createdAt: new Date(),
    };

    const result = await getBooksCollection().insertOne(newBook);
    res
      .status(201)
      .json({
        message: "Book added successfully",
        insertedId: result.insertedId,
      });
  } catch (error: unknown) {
    handleError(res, error);
  }
});

// PATCH /books/:id
router.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id: string = String(req.params.id);
    if (!isValidId(id)) {
      sendError(res, 400, "Invalid book id");
      return;
    }

    const fields = validateBook((req.body ?? {}) as Record<string, unknown>);
    if (typeof fields === "string") {
      sendError(res, 400, fields);
      return;
    }

    const books = getBooksCollection();
    const _id = new ObjectId(id);

    const book = await books.findOne({ _id });
    if (!book) {
      sendError(res, 404, "Book not found");
      return;
    }

    // Copies that are currently borrowed must stay covered by the new total
    const borrowedNow: number = book.totalCopies - book.availableCopies;
    if (fields.totalCopies < borrowedNow) {
      sendError(
        res,
        400,
        `${borrowedNow} copies are borrowed right now, so total copies cannot be less than ${borrowedNow}`,
      );
      return;
    }

    await books.updateOne(
      { _id },
      {
        $set: { ...fields, availableCopies: fields.totalCopies - borrowedNow },
      },
    );

    res.json({ message: "Book updated successfully" });
  } catch (error: unknown) {
    handleError(res, error);
  }
});

// DELETE /books/:id
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id: string = String(req.params.id);
    if (!isValidId(id)) {
      sendError(res, 400, "Invalid book id");
      return;
    }

    const result = await getBooksCollection().deleteOne({
      _id: new ObjectId(id),
    });
    if (result.deletedCount === 0) {
      sendError(res, 404, "Book not found");
      return;
    }

    res.json({ message: "Book deleted successfully" });
  } catch (error: unknown) {
    handleError(res, error);
  }
});

export default router;
