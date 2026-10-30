import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getBooksCollection, getBorrowsCollection } from "../db";
import { verifyToken } from "../middleware/auth";
import { Borrow } from "../types";
import { handleError, isValidId, sendError } from "../utils";

const router = Router();

const BORROW_DAYS: number = 7;

// Every borrow route needs a valid token
router.use(verifyToken);

// POST /borrows
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      sendError(res, 401, "Unauthorized");
      return;
    }

    const { bookId } = (req.body ?? {}) as Record<string, unknown>;
    if (typeof bookId !== "string" || !isValidId(bookId)) {
      sendError(res, 400, "Invalid book id");
      return;
    }

    const books = getBooksCollection();
    const borrows = getBorrowsCollection();
    const bookObjectId = new ObjectId(bookId);

    const alreadyBorrowed = await borrows.findOne({
      bookId: bookObjectId,
      userEmail: user.email,
    });
    if (alreadyBorrowed) {
      sendError(res, 409, "You have already borrowed this book");
      return;
    }

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
      userName: user.name,
      userEmail: user.email,
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

// GET /borrows  -> borrows of the logged in user
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      sendError(res, 401, "Unauthorized");
      return;
    }

    const list: Borrow[] = await getBorrowsCollection()
      .find({ userEmail: user.email })
      .sort({ borrowDate: -1 })
      .toArray();

    res.json(list);
  } catch (error: unknown) {
    handleError(res, error);
  }
});

// DELETE /borrows/:id  -> return a book
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      sendError(res, 401, "Unauthorized");
      return;
    }

    const id: string = String(req.params.id);
    if (!isValidId(id)) {
      sendError(res, 400, "Invalid borrow id");
      return;
    }

    const borrow = await getBorrowsCollection().findOneAndDelete({
      _id: new ObjectId(id),
      userEmail: user.email,
    });

    if (!borrow) {
      sendError(res, 404, "Borrow record not found");
      return;
    }

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
