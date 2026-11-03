# BookNook Server

Express and MongoDB API for BookNook, a small online library.

**Live API:** https://booknook-server-krh1.onrender.com

## API Routes

| Method | Route        | Access                   |
| ------ | ------------ | ------------------------ |
| GET    | /books       | Public                   |
| GET    | /books/:id   | Public                   |
| POST   | /books       | JWT required             |
| PATCH  | /books/:id   | JWT required, owner only |
| DELETE | /books/:id   | JWT required, owner only |
| POST   | /borrows     | JWT required             |
| GET    | /borrows     | JWT required             |
| DELETE | /borrows/:id | JWT required             |

## Run Locally

1. Install the packages: `npm install`
2. Copy `.env.example` to `.env` and fill in `MONGODB_URI`, `JWT_SECRET` and `CLIENT_URL`
3. Start the server: `npm run dev`
