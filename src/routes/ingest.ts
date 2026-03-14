import { Router } from "express";
import multer from "multer";
import { ingestPDF } from "../controllers/ingestController.js";

const router = Router();

// Configure multer for in-memory PDF upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// POST /ingest — upload and process a PDF
router.post("/", upload.single("pdf"), ingestPDF);

export default router;
