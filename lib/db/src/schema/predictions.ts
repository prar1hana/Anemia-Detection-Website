import { pgTable, serial, text, integer, boolean, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const predictionsTable = pgTable("predictions", {
  id: serial("id").primaryKey(),
  annotatedImageBase64: text("annotated_image_base64").notNull(),
  totalCells: integer("total_cells").notNull().default(0),
  classCounts: jsonb("class_counts").notNull().default([]),
  hasAnemia: boolean("has_anemia").notNull().default(false),
  confidence: real("confidence").notNull().default(0),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});

export const insertPredictionSchema = createInsertSchema(predictionsTable).omit({ id: true });
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type Prediction = typeof predictionsTable.$inferSelect;
