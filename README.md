# 🧠 Peblo AI — Adaptive Quiz Backend

An intelligent backend that ingests educational PDFs, generates adaptive quizzes using AI (OpenRouter), and tracks student performance to adjust difficulty dynamically.

## Architecture

```
src/
├── index.ts                 # Express server entry point
├── db/
│   ├── schema.ts            # Drizzle ORM schema (sources, chunks, questions, student_stats)
│   └── index.ts             # Database client initialization
├── routes/
│   ├── ingest.ts            # POST /ingest
│   ├── quiz.ts              # POST /quiz/generate, GET /quiz
│   └── answer.ts            # POST /submit-answer
├── controllers/
│   ├── ingestController.ts  # PDF parsing + chunking + storage
│   ├── quizController.ts    # Quiz generation via OpenRouter + retrieval
│   └── answerController.ts  # Answer validation + adaptive stats
└── services/
    ├── pdfService.ts        # pdf-parse extraction + overlapping chunking
    ├── openRouterService.ts # OpenRouter API with structured prompts
    └── quizService.ts       # DB queries with topic/difficulty filters
```

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- An **OpenRouter API key** ([get one here](https://openrouter.ai/keys))

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/Ishan4705/AI-Backend-Challenge.git
cd AI-Backend-Challenge

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY
```

## Configuration

Copy `.env.example` to `.env` and fill in:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `OPENROUTER_API_KEY` | Your OpenRouter API key | — |
| `OPENROUTER_MODEL` | LLM model to use | `google/gemini-2.0-flash-001` |
| `DATABASE_URL` | SQLite database path | `./peblo.db` |

## Running

```bash
# Development (hot-reload)
npm run dev

# Push database schema
npm run db:push

# Production build
npm run build
npm start
```

## API Endpoints

### `POST /ingest`
Upload a PDF for text extraction and chunking.

```bash
curl -X POST http://localhost:3000/ingest \
  -F "pdf=@./sample.pdf" \
  -F "topic=Science" \
  -F "grade=Grade 3" \
  -F "subject=Plants & Animals"
```

### `POST /quiz/generate`
Generate quiz questions from an ingested source.

```bash
curl -X POST http://localhost:3000/quiz/generate \
  -H "Content-Type: application/json" \
  -d '{"sourceId": "<source-id>", "difficulty": "medium", "numQuestions": 5}'
```

### `GET /quiz`
Retrieve stored questions with optional filters.

```bash
curl "http://localhost:3000/quiz?topic=Science&difficulty=easy&limit=10"
```

### `POST /submit-answer`
Submit an answer and get adaptive feedback.

```bash
curl -X POST http://localhost:3000/submit-answer \
  -H "Content-Type: application/json" \
  -d '{"questionId": "<question-id>", "studentId": "student-001", "answer": "Photosynthesis"}'
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | Express 5 |
| Database | SQLite via better-sqlite3 |
| ORM | Drizzle ORM |
| PDF Parsing | pdf-parse |
| AI/LLM | OpenRouter API (Gemini Flash) |
| File Upload | Multer |

## License

ISC
