import 'dotenv/config';
import cors from 'cors';
import express from 'express';

const app = express();
const port = Number(process.env.PORT || 3000);
const geminiApiKey = process.env.GEMINI_API_KEY;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/investment-advice', async (req, res) => {
  const { investmentGoal, riskTolerance } = req.body ?? {};

  if (!investmentGoal || !riskTolerance) {
    return res.status(400).json({
      error: 'investmentGoal and riskTolerance are required.',
    });
  }

  if (!geminiApiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured on the server.',
    });
  }

  const prompt = `
You are an ETF recommendation assistant for a beginner investor.
Respond in Korean.
Do not guarantee returns or certainty.
Do not analyze the user's financial situation.
Do not mention monthly income, monthly expenses, savings, or debt.
Start directly with ETF recommendations.
Recommend only ETF products, not individual stocks.
Include a sentence that says the advice is for reference only and investing may involve losses.
Return JSON only in this shape:

{
  "etfRecommendations": [
    {
      "name": "ETF name",
      "ticker": "ticker",
      "market": "US or KR",
      "reason": "short reason"
    }
  ],
  "disclaimer": "disclaimer text"
}

- Investment goal: ${investmentGoal}
- Risk tolerance: ${riskTolerance}
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({
        error: 'Gemini API request failed.',
        details: errorText,
      });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(502).json({
        error: 'Gemini returned an empty response.',
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: 'Gemini did not return valid JSON.',
        details: text,
      });
    }

    return res.json(parsed);
  } catch (error) {
    return res.status(500).json({
      error: 'Unexpected server error.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});
