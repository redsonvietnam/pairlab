// Vercel Serverless Function: /api/analyze
// Uses GEMINI_API_KEY from Vercel environment variables

interface AnalyzeRequest {
  code: string;
  filename: string;
  language: string;
  analysisType: "security" | "quality" | "full";
}

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured. Please add it in Vercel environment variables.",
    });
  }

  try {
    const body: AnalyzeRequest = req.body;

    if (!body.code || !body.filename) {
      return res.status(400).json({ error: "Missing required fields: code, filename" });
    }

    // Truncate very large files
    const code = body.code.slice(0, 15000);
    const analysisType = body.analysisType || "full";

    const systemPrompt = `You are a senior code reviewer analyzing source code. Respond ONLY with valid JSON matching this exact schema:
{
  "insights": [
    {
      "type": "vulnerability" | "improvement" | "info",
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "title": "short title",
      "description": "detailed explanation",
      "line": optional_line_number,
      "suggestion": "optional fix suggestion"
    }
  ],
  "summary": "2-3 sentence summary of the code quality and key findings",
  "score": 0-100
}

Analysis focus based on type:
- "security": Focus on hardcoded secrets, injection vulnerabilities, unsafe patterns, XSS, CSRF, insecure dependencies, authentication issues
- "quality": Focus on code complexity, maintainability, naming conventions, error handling, performance issues
- "full": Cover both security and quality

Be specific with line numbers when possible. Do not include false positives. Be concise but thorough.`;

    const userPrompt = `Analyze this ${body.language} file "${body.filename}" for ${analysisType} issues:

\`\`\`${body.language.toLowerCase()}
${code}
\`\`\``;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errorText);

      if (geminiRes.status === 429) {
        return res.status(429).json({ error: "AI rate limit exceeded. Please try again shortly." });
      }
      return res.status(500).json({ error: `Gemini API error (${geminiRes.status})` });
    }

    const geminiData = await geminiRes.json();
    const textContent =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse the JSON response
    let parsed;
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = textContent.match(/```json\s*([\s\S]*?)```/) || 
                        textContent.match(/```\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : textContent.trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      // If JSON parsing fails, return a basic response
      return res.status(200).json({
        insights: [],
        summary: textContent.slice(0, 500),
        score: 50,
      });
    }

    return res.status(200).json({
      insights: parsed.insights || [],
      summary: parsed.summary || "",
      score: typeof parsed.score === "number" ? parsed.score : 50,
    });
  } catch (err: any) {
    console.error("Analysis error:", err);
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
}
