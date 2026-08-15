import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateQuiz, type QuizQuestion } from "./quiz.server";

export type { QuizQuestion };

const schema = z.object({
  subject: z.string().min(1).max(80),
  topic: z.string().max(120).optional(),
  count: z.number().int().min(3).max(20).default(5),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  exam: z.string().max(40).optional(),
  classYear: z.string().max(40).optional(),
});

export const createQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => generateQuiz(data));
