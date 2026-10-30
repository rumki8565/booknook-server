import booksRouter from "./routes/books";
import borrowsRouter from "./routes/borrows";
import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./db";

dotenv.config();

const app = express();
const port: number = Number(process.env.PORT) || 5000;

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use("/books", booksRouter);
app.use("/borrows", borrowsRouter);

app.get("/", (_req: Request, res: Response): void => {
  res.json({ message: "BookNook server is running" });
});

async function startServer(): Promise<void> {
  try {
    await connectDB();
    app.listen(port, (): void => {
      console.log(`BookNook server listening on port ${port}`);
    });
  } catch (error: unknown) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

void startServer();
