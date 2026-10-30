import { Response } from "express";
import { ObjectId } from "mongodb";

export function isValidId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id) && ObjectId.isValid(id);
}

export function sendError(
  res: Response,
  status: number,
  message: string,
): void {
  res.status(status).json({ message });
}

export function handleError(res: Response, error: unknown): void {
  console.error(error);
  sendError(res, 500, "Something went wrong on the server");
}
