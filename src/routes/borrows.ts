import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getBooksCollection, getBorrowsCollection } from "../db";
import { Borrow } from "../types";
import { handleError, isValidId, sendError } from "../utils";

const router = Router();

const BORROW_DAYS: number = 7;

// POST /borrows
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookId, userName, userEmail } = (req.body ?? {}) as Record<
      string,
      unknown
    >;

    if (typeof bookId !== "string" || !isValidId(bookId)) {
      sendError(res, 400, "Invalid book id");
      return;
    }
    if (
      typeof userName !== "string" ||
      !userName.trim() ||
      typeof userEmail !== "string" ||
      !userEmail.trim()
    ) {
      sendError(res, 400, "User name and email are required");
      return;
    }

    const books = getBooksCollection();
    const borrows = getBorrowsCollection();
    const bookObjectId = new ObjectId(bookId);

    // No double borrow: a borrow record exists only while the book is still borrowed
    const alreadyBorrowed = await borrows.findOne({
      bookId: bookObjectId,
      userEmail,
    });
    if (alreadyBorrowed) {
      sendError(res, 409, "You have already borrowed this book");
      return;
    }

    // Decrease copies by 1 only if at least one copy is available
    const book = await books.findOneAndUpdate(
      { _id: bookObjectId, availableCopies: { $gt: 0 } },
      { $inc: { availableCopies: -1 } },
      { returnDocument: "after" },
    );

    if (!book) {
      const exists = await books.findOne({ _id: bookObjectId });
      if (!exists) {
        sendError(res, 404, "Book not found");
      } else {
        sendError(res, 400, "Sorry, this book is not available right now");
      }
      return;
    }

    const borrowDate = new Date();
    const returnDate = new Date(borrowDate);
    returnDate.setDate(returnDate.getDate() + BORROW_DAYS);

    const newBorrow: Borrow = {
      bookId: bookObjectId,
      bookTitle: book.title,
      bookImage: book.image,
      userName: userName.trim(),
      userEmail: userEmail.trim(),
      borrowDate,
      returnDate,
    };

    try {
      const result = await borrows.insertOne(newBorrow);
      res
        .status(201)
        .json({
          message: "Book borrowed successfully",
          insertedId: result.insertedId,
        });
    } catch (insertError: unknown) {
      // Put the copy back if saving the borrow failed
      await books.updateOne(
        { _id: bookObjectId },
        { $inc: { availableCopies: 1 } },
      );
      throw insertError;
    }
  } catch (error: unknown) {
    handleError(res, error);
  }
});

// GET /borrows?email=...  -> borrows of one user
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.query;
    if (typeof email !== "string" || !email) {
      sendError(res, 400, "User email is required");
      return;
    }

    const list: Borrow[] = await getBorrowsCollection()
      .find({ userEmail: email })
      .sort({ borrowDate: -1 })
      .toArray();

    res.json(list);
  } catch (error: unknown) {
    handleError(res, error);
  }
});

// DELETE /borrows/:id?email=...  -> return a book
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id: string = String(req.params.id);
    const { email } = req.query;

    if (!isValidId(id)) {
      sendError(res, 400, "Invalid borrow id");
      return;
    }
    if (typeof email !== "string" || !email) {
      sendError(res, 400, "User email is required");
      return;
    }

    const borrow = await getBorrowsCollection().findOneAndDelete({
      _id: new ObjectId(id),
      userEmail: email,
    });

    if (!borrow) {
      sendError(res, 404, "Borrow record not found");
      return;
    }

    // Increase copies by 1 when the book is returned
    await getBooksCollection().updateOne(
      { _id: borrow.bookId },
      { $inc: { availableCopies: 1 } },
    );

    res.json({ message: "Book returned successfully" });
  } catch (error: unknown) {
    handleError(res, error);
  }
});

export default router;
