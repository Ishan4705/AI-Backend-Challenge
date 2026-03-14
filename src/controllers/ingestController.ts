import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";
import { sources, chunks } from "../db/schema.js";
import { extractTextFromPDF, chunkText } from "../services/pdfService.js";

/**
 * POST /ingest
 * Accepts a PDF file upload with optional metadata (topic, grade, subject).
 * Extracts text, chunks it with overlap, and stores in the database.
 */
export async function ingestPDF(req: Request, res: Response): Promise<void> {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: "No PDF file uploaded" });
      return;
    }

    // Extract metadata from request body
    const { topic, grade, subject } = req.body;

    // 1. Extract text from the PDF
    const text = await extractTextFromPDF(file.buffer);

    if (!text || text.trim().length === 0) {
      res.status(400).json({ error: "Could not extract text from the PDF" });
      return;
    }

    // 2. Chunk the text with overlapping windows
    const textChunks = chunkText(text);

    // 3. Create a source record
    const sourceId = uuidv4();
    await db.insert(sources).values({
      id: sourceId,
      filename: file.originalname,
      topic: topic || null,
      grade: grade || null,
      subject: subject || null,
      totalChunks: textChunks.length,
    });

    // 4. Insert all chunks linked to this source
    const chunkRecords = textChunks.map((content, index) => ({
      id: uuidv4(),
      sourceId: sourceId,
      chunkIndex: index,
      content: content,
    }));

    if (chunkRecords.length > 0) {
      await db.insert(chunks).values(chunkRecords);
    }

    res.status(201).json({
      message: "PDF ingested successfully",
      sourceId,
      filename: file.originalname,
      totalChunks: textChunks.length,
      metadata: { topic, grade, subject },
    });
  } catch (error) {
    console.error("Ingest error:", error);
    res.status(500).json({ error: "Failed to ingest PDF" });
  }
}
