import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port: number = Number(process.env.PORT) || 5000;

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

app.get("/", (_req: Request, res: Response): void => {
  res.json({ message: "BookNook server is running" });
});

app.listen(port, (): void => {
  console.log(`BookNook server listening on port ${port}`);
});
