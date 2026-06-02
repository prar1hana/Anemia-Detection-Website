import { Router, type IRouter } from "express";
import multer from "multer";
import FormData from "form-data";
import fetch from "node-fetch";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? "http://localhost:8001";

router.post("/predict", upload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No image file provided" });
    return;
  }

  try {
    const formData = new FormData();
    formData.append("image", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const mlResponse = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: "POST",
      body: formData,
      headers: formData.getHeaders(),
    });

    const result = await mlResponse.json();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Prediction failed" });
  }
});

router.get("/predict/history", (_req, res) => {
  res.json([]);
});


router.get("/predict/stats", (_req, res) => {
  res.json({
    success: true,
    data: {
      totalPredictions: 0,
      totalCellsAnalyzed: 0,
      averageConfidence: 0,
      anemiaPositiveCount: 0,
    },
    mostCommonAbnormality: null,
  });
});

export default router;

// import { Router, type IRouter } from "express";
// import multer from "multer";
// import FormData from "form-data";
// import fetch from "node-fetch";
// import { db, predictionsTable } from "@workspace/db";
// import { desc, sql, ne } from "drizzle-orm";
// import { logger } from "../lib/logger";

// const router: IRouter = Router();

// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
//   fileFilter: (_req, file, cb) => {
//     if (file.mimetype.startsWith("image/")) {
//       cb(null, true);
//     } else {
//       cb(new Error("Only image files are allowed"));
//     }
//   },
// });

// const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? "http://localhost:8001";

// router.post("/predict", upload.single("image"), async (req, res): Promise<void> => {
//   if (!req.file) {
//     res.status(400).json({ error: "No image file provided" });
//     return;
//   }

//   try {
//     // Forward image to Python ML microservice
//     const formData = new FormData();
//     formData.append("image", req.file.buffer, {
//       filename: req.file.originalname ?? "image.jpg",
//       contentType: req.file.mimetype,
//     });

//     req.log.info({ filename: req.file.originalname, size: req.file.size }, "Forwarding image to ML service");

//     const mlResponse = await fetch(`${ML_SERVICE_URL}/infer`, {
//       method: "POST",
//       body: formData,
//       headers: formData.getHeaders(),
//     });

//     if (!mlResponse.ok) {
//       const errText = await mlResponse.text();
//       req.log.error({ status: mlResponse.status, body: errText }, "ML service error");
//       res.status(502).json({ error: "ML service returned an error" });
//       return;
//     }

//     const mlResult = (await mlResponse.json()) as {
//       annotatedImageBase64: string;
//       totalCells: number;
//       classCounts: { className: string; count: number; percentage: number }[];
//       confidence: number;
//     };

//     // Determine anemia flag: any abnormal cell > 10% of total
//     const ANEMIA_INDICATORS = new Set([
//       "Macrocyte", "Microcyte", "Spherocyte", "Target cell",
//       "Stomatocyte", "Ovalocyte", "Teardrop", "Burr cell",
//       "Schistocyte", "Hypochromia", "Elliptocyte",
//     ]);

//     const abnormalCells = mlResult.classCounts
//       .filter((c) => ANEMIA_INDICATORS.has(c.className))
//       .reduce((sum, c) => sum + c.count, 0);
//     const hasAnemia = mlResult.totalCells > 0 && (abnormalCells / mlResult.totalCells) > 0.10;

//     // Persist to database
//     const [saved] = await db
//       .insert(predictionsTable)
//       .values({
//         annotatedImageBase64: mlResult.annotatedImageBase64,
//         totalCells: mlResult.totalCells,
//         classCounts: mlResult.classCounts,
//         hasAnemia,
//         confidence: mlResult.confidence,
//       })
//       .returning();

//     req.log.info({ id: saved.id, totalCells: saved.totalCells, hasAnemia }, "Prediction saved");

//     res.json({
//       id: saved.id,
//       annotatedImageBase64: saved.annotatedImageBase64,
//       totalCells: saved.totalCells,
//       classCounts: saved.classCounts,
//       hasAnemia: saved.hasAnemia,
//       confidence: saved.confidence,
//       processedAt: saved.processedAt.toISOString(),
//     });
//   } catch (err) {
//     req.log.error({ err }, "Prediction failed");
//     res.status(500).json({ error: "Prediction failed. Please try again." });
//   }
// });

// router.get("/predict/history", async (req, res): Promise<void> => {
//   try {
//     const predictions = await db
//       .select({
//         id: predictionsTable.id,
//         totalCells: predictionsTable.totalCells,
//         hasAnemia: predictionsTable.hasAnemia,
//         confidence: predictionsTable.confidence,
//         processedAt: predictionsTable.processedAt,
//         classCounts: predictionsTable.classCounts,
//       })
//       .from(predictionsTable)
//       .orderBy(desc(predictionsTable.processedAt))
//       .limit(20);

//     const history = predictions.map((p) => {
//       const counts = p.classCounts as { className: string; count: number; percentage: number }[];
//       const normalEntry = counts.find((c) => c.className === "Normal");
//       return {
//         id: p.id,
//         totalCells: p.totalCells,
//         hasAnemia: p.hasAnemia,
//         confidence: p.confidence,
//         processedAt: p.processedAt.toISOString(),
//         normalPercentage: normalEntry?.percentage ?? 0,
//       };
//     });

//     res.json(history);
//   } catch (err) {
//     req.log.error({ err }, "Failed to fetch prediction history");
//     res.status(500).json({ error: "Failed to fetch history" });
//   }
// });

// router.get("/predict/stats", async (req, res): Promise<void> => {
//   try {
//     const [stats] = await db
//       .select({
//         totalPredictions: sql<number>`count(*)::int`,
//         totalCellsAnalyzed: sql<number>`coalesce(sum(${predictionsTable.totalCells}), 0)::int`,
//         averageConfidence: sql<number>`coalesce(avg(${predictionsTable.confidence}), 0)::float`,
//         anemiaPositiveCount: sql<number>`count(*) filter (where ${predictionsTable.hasAnemia} = true)::int`,
//       })
//       .from(predictionsTable);

//     // Find most common abnormality across all predictions
//     const allPredictions = await db
//       .select({ classCounts: predictionsTable.classCounts })
//       .from(predictionsTable);

//     const ANEMIA_INDICATORS = [
//       "Macrocyte", "Microcyte", "Spherocyte", "Target cell",
//       "Stomatocyte", "Ovalocyte", "Teardrop", "Burr cell",
//       "Schistocyte", "Hypochromia", "Elliptocyte",
//     ];

//     const abnormalTotals: Record<string, number> = {};
//     for (const pred of allPredictions) {
//       const counts = pred.classCounts as { className: string; count: number }[];
//       for (const cls of counts) {
//         if (ANEMIA_INDICATORS.includes(cls.className) && cls.count > 0) {
//           abnormalTotals[cls.className] = (abnormalTotals[cls.className] ?? 0) + cls.count;
//         }
//       }
//     }

//     const mostCommonAbnormality =
//       Object.keys(abnormalTotals).length > 0
//         ? Object.entries(abnormalTotals).sort((a, b) => b[1] - a[1])[0][0]
//         : null;

//     res.json({
//       totalPredictions: stats.totalPredictions ?? 0,
//       totalCellsAnalyzed: stats.totalCellsAnalyzed ?? 0,
//       averageConfidence: Math.round((stats.averageConfidence ?? 0) * 100) / 100,
//       anemiaPositiveCount: stats.anemiaPositiveCount ?? 0,
//       mostCommonAbnormality,
//     });
//   } catch (err) {
//     req.log.error({ err }, "Failed to fetch prediction stats");
//     res.status(500).json({ error: "Failed to fetch stats" });
//   }
// });

// export default router;
