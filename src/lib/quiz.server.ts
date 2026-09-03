export type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  topic: string;
};

type Params = {
  subject: string;
  topic?: string | undefined;
  count: number;
  difficulty: "easy" | "medium" | "hard";
  exam?: string | undefined;
  classYear?: string | undefined;
};

export async function generateQuiz(params: Params): Promise<QuizQuestion[]> {
  const prompt = [
    `Create ${params.count} original multiple-choice practice questions for a Nigerian student.`,
    `Subject: ${params.subject}.`,
    params.topic ? `Topic: ${params.topic}.` : "Cover a spread of core topics.",
    params.exam ? `Exam style: ${params.exam}.` : "",
    params.classYear ? `Student level: ${params.classYear}.` : "",
    `Difficulty: ${params.difficulty}.`,
    "Write original questions in the style of the exam — never copy copyrighted past questions verbatim.",
    "Each question has exactly 4 options, one correct answer, and a short clear explanation (max 2 sentences).",
  ]
    .filter(Boolean)
    .join(" ");

  const key = geminiKey();
  if (key) {
    const parsed = await geminiStructured<{ questions?: QuizQuestion[] }>({
      system:
        "You are an exam question writer for Nigerian secondary school students. Reply only with JSON matching the schema.",
      prompt,
      key,
      schema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                answerIndex: { type: "integer" },
                explanation: { type: "string" },
                topic: { type: "string" },
              },
              required: ["question", "options", "answerIndex", "explanation", "topic"],
            },
          },
        },
        required: ["questions"],
      },
    });
    const questions = (parsed.questions ?? []).filter(
      (q) => Array.isArray(q.options) && q.options.length === 4,
    );
    if (!questions.length) throw new Error("Could not generate questions right now.");
    return questions;
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are an exam question writer for Nigerian secondary school students. Always reply by calling the provided tool.",
        },
        { role: "user", content: prompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_questions",
            description: "Return the generated practice questions",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      options: {
                        type: "array",
                        items: { type: "string" },
                        minItems: 4,
                        maxItems: 4,
                      },
                      answerIndex: { type: "integer" },
                      explanation: { type: "string" },
                      topic: { type: "string" },
                    },
                    required: [
                      "question",
                      "options",
                      "answerIndex",
                      "explanation",
                      "topic",
                    ],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_questions" } },
    }),
  });

  if (response.status === 429) throw new Error("Too many requests. Try again shortly.");
  if (response.status === 402) throw new Error("AI credits exhausted. Please top up.");
  if (!response.ok) {
    console.error("quiz gateway error", response.status, await response.text().catch(() => ""));
    throw new Error("Could not generate questions right now.");
  }

  const json = (await response.json()) as {
    choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
  };
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("Could not generate questions right now.");

  const parsed = JSON.parse(args) as { questions?: QuizQuestion[] };
  const questions = (parsed.questions ?? []).filter(
    (q) => Array.isArray(q.options) && q.options.length === 4,
  );
  if (!questions.length) throw new Error("Could not generate questions right now.");
  return questions;
}
