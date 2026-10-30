import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { sendError } from "../utils";

export function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header: string | undefined = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    sendError(res, 401, "Unauthorized: token is missing");
    return;
  }

  const secret: string | undefined = process.env.JWT_SECRET;
  if (!secret) {
    sendError(res, 500, "Server is missing the JWT secret");
    return;
  }

  try {
    const decoded = jwt.verify(header.slice(7), secret);

    if (typeof decoded === "string" || typeof decoded.email !== "string") {
      sendError(res, 401, "Unauthorized: invalid token");
      return;
    }

    req.user = {
      name: typeof decoded.name === "string" ? decoded.name : "",
      email: decoded.email,
    };
    next();
  } catch {
    sendError(res, 401, "Unauthorized: invalid or expired token");
  }
}
