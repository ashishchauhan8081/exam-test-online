export default async function handler(req, res) {
  // ============================================
  // CORS
  // ============================================

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ============================================
  // ONLY POST
  // ============================================

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Only POST method is allowed",
    });
  }

  try {
    // ============================================
    // API KEY
    // ============================================

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error:
          "GEMINI_API_KEY Vercel Environment Variables में नहीं मिली।",
      });
    }

    // ============================================
    // REQUEST DATA
    // ============================================

    const {
      topic,
      exam = "UPPCS",
      count = 10,
      language = "Hindi",
      difficulty = "Medium",
      currentAffairs = false,
    } = req.body || {};

    if (!topic || !String(topic).trim()) {
      return res.status(400).json({
        success: false,
        error: "कृपया Topic डालें।",
      });
    }

    // ============================================
    // QUESTION COUNT
    // ============================================

    const questionCount = Math.min(
      Math.max(Number(count) || 10, 1),
      50
    );

    // ============================================
    // CURRENT DATE
    // ============================================

    const now = new Date();

    const currentDate = now.toLocaleDateString(
      "en-IN",
      {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    // ============================================
    // PROMPT
    // ============================================

    let prompt = "";

    if (currentAffairs) {
      prompt = `
आप भारत के प्रतियोगी परीक्षा विद्यार्थियों के लिए
Current Affairs MCQ बनाने वाले विशेषज्ञ हैं।

आज की तारीख:
${currentDate}

परीक्षा:
${exam}

विषय:
${topic}

प्रश्नों की संख्या:
${questionCount}

भाषा:
${language}

कठिनाई:
${difficulty}

यह CURRENT AFFAIRS MODE है।

बहुत महत्वपूर्ण नियम:

1. Google Search का उपयोग करके वर्तमान और हाल की
   वास्तविक घटनाओं की जानकारी verify करें।

2. पुराने 2024 या उससे भी पुराने सामान्य प्रश्न
   केवल इसलिए न दें क्योंकि वे आपके training knowledge
   में उपलब्ध हैं।

3. मुख्य रूप से वर्तमान तारीख के आसपास की
   recent/current affairs घटनाओं को प्राथमिकता दें।

4. यदि topic Sports है तो हाल की खेल प्रतियोगिताओं,
   खिलाड़ियों, पुरस्कारों, रिकॉर्ड, नियुक्तियों,
   परिणामों आदि को देखें।

5. यदि topic National है तो भारत की हाल की
   सरकारी घोषणाएँ, योजनाएँ, नियुक्तियाँ,
   रिपोर्ट, कानून, महत्वपूर्ण घटनाएँ आदि देखें।

6. यदि topic International है तो हाल की
   अंतरराष्ट्रीय घटनाएँ, summit, agreement,
   appointments, reports आदि देखें।

7. यदि किसी तथ्य की पुष्टि नहीं हो सकती,
   तो उसे MCQ में शामिल न करें।

8. किसी तथ्य को invent न करें।

9. प्रत्येक MCQ में चार विकल्प A, B, C, D हों।

10. सही उत्तर केवल A, B, C या D होना चाहिए।

11. Explanation छोटा लेकिन तथ्यात्मक हो।

12. प्रश्न competitive examination level के हों।

13. सभी प्रश्न एक-दूसरे से अलग हों।

14. पुराने static GK और पुराने 2024 questions
    को current affairs के रूप में न दें।

15. केवल valid JSON दें।

Exact JSON format:

{
  "questions": [
    {
      "question": "प्रश्न",
      "options": {
        "A": "विकल्प A",
        "B": "विकल्प B",
        "C": "विकल्प C",
        "D": "विकल्प D"
      },
      "answer": "A",
      "explanation": "सही उत्तर का संक्षिप्त explanation"
    }
  ]
}
`;
    } else {
      prompt = `
आप एक उच्च गुणवत्ता वाले प्रतियोगी परीक्षा MCQ Generator हैं।

परीक्षा:
${exam}

विषय:
${topic}

प्रश्नों की संख्या:
${questionCount}

भाषा:
${language}

कठिनाई स्तर:
${difficulty}

नियम:

1. प्रत्येक प्रश्न के चार विकल्प A, B, C और D हों।
2. केवल एक सही उत्तर हो।
3. सही उत्तर A/B/C/D में दें।
4. प्रत्येक प्रश्न का explanation दें।
5. प्रश्न competitive exam level के हों।
6. प्रश्न दोहराए न जाएँ।
7. गलत तथ्य न दें।
8. केवल valid JSON दें।

Exact JSON format:

{
  "questions": [
    {
      "question": "प्रश्न",
      "options": {
        "A": "विकल्प A",
        "B": "विकल्प B",
        "C": "विकल्प C",
        "D": "विकल्प D"
      },
      "answer": "A",
      "explanation": "सही उत्तर का explanation"
    }
  ]
}
`;
    }

    // ============================================
    // GEMINI MODELS
    // ============================================
    //
    // आपकी वर्तमान AI Studio limits को ध्यान में रखते हुए
    // Flash-Lite models को पहले रखा गया है।
    //
    // 1. Gemini 3.5 Flash Lite
    // 2. Gemini 3.1 Flash Lite
    //
    // ============================================

    const models = [
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
    ];

    let geminiResponse = null;
    let geminiData = null;
    let lastError = null;
    let lastModel = null;

    // ============================================
    // SMALL DELAY FUNCTION
    // ============================================

    const sleep = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    // ============================================
    // TRY MODELS
    // ============================================

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      lastModel = model;

      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      try {
        // ========================================
        // REQUEST BODY
        // ========================================

        const requestBody = {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],

          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        };

        // ========================================
        // CURRENT AFFAIRS SEARCH
        // ========================================

        if (currentAffairs) {
          requestBody.tools = [
            {
              google_search: {},
            },
          ];
        }

        // ========================================
        // API REQUEST
        // ========================================

        geminiResponse = await fetch(url, {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },

          body: JSON.stringify(requestBody),
        });

        // ========================================
        // READ RESPONSE
        // ========================================

        geminiData = await geminiResponse.json();

        // ========================================
        // SUCCESS
        // ========================================

        if (geminiResponse.ok) {
          console.log(
            `Gemini success with model: ${model}`
          );

          break;
        }

        // ========================================
        // ERROR
        // ========================================

        lastError =
          geminiData?.error?.message ||
          "Gemini API request failed.";

        console.error(
          `Gemini error with ${model}:`,
          geminiData
        );

        // ========================================
        // RATE LIMIT / SERVER ERROR
        // ========================================

        if (
          geminiResponse.status === 429 ||
          geminiResponse.status === 503
        ) {
          console.warn(
            `Model ${model} unavailable. Trying next model...`
          );

          // छोटा delay ताकि लगातार requests न जाएँ
          if (i < models.length - 1) {
            await sleep(1000);
          }

          continue;
        }

        // ========================================
        // OTHER ERROR
        // ========================================

        break;
      } catch (error) {
        lastError =
          error?.message ||
          "Network error while connecting to Gemini.";

        console.error(
          `Network error with ${model}:`,
          error
        );

        if (i < models.length - 1) {
          await sleep(1000);
        }

        continue;
      }
    }

    // ============================================
    // FINAL GEMINI ERROR
    // ============================================

    if (
      !geminiResponse ||
      !geminiResponse.ok
    ) {
      let friendlyError =
        lastError ||
        "Gemini अभी उपलब्ध नहीं है। कृपया बाद में फिर प्रयास करें।";

      const errorLower =
        String(friendlyError).toLowerCase();

      if (
        errorLower.includes("quota") ||
        errorLower.includes("rate limit") ||
        errorLower.includes("too many requests") ||
        errorLower.includes("429")
      ) {
        friendlyError =
          "Gemini API quota/rate limit समाप्त या उपलब्ध नहीं है। कृपया थोड़ी देर बाद फिर प्रयास करें।";
      }

      return res.status(
        geminiResponse?.status || 500
      ).json({
        success: false,
        error: friendlyError,
        model: lastModel,
      });
    }

    // ============================================
    // GET TEXT
    // ============================================

    const text =
      geminiData
        ?.candidates?.[0]
        ?.content?.parts?.[0]
        ?.text;

    if (!text) {
      console.error(
        "Gemini Empty Response:",
        geminiData
      );

      return res.status(500).json({
        success: false,
        error:
          "Gemini ने कोई MCQ response नहीं दिया।",
      });
    }

    // ============================================
    // CLEAN JSON
    // ============================================

    let cleanText = String(text).trim();

    cleanText = cleanText
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    // ============================================
    // PARSE JSON
    // ============================================

    let parsed;

    try {
      parsed = JSON.parse(cleanText);
    } catch (parseError) {
      console.error(
        "JSON Parse Error:",
        parseError
      );

      console.error(
        "Gemini Text:",
        cleanText
      );

      return res.status(500).json({
        success: false,
        error:
          "Gemini ने valid JSON नहीं भेजा।",
      });
    }

    // ============================================
    // QUESTIONS CHECK
    // ============================================

    if (
      !parsed ||
      !Array.isArray(parsed.questions)
    ) {
      return res.status(500).json({
        success: false,
        error:
          "Gemini response में questions नहीं मिले।",
      });
    }

    // ============================================
    // NORMALIZE QUESTIONS
    // ============================================

    const questions = parsed.questions
      .slice(0, questionCount)
      .map((item) => {
        const answer = String(
          item?.answer || ""
        )
          .trim()
          .toUpperCase();

        return {
          question: String(
            item?.question || ""
          ).trim(),

          options: {
            A: String(
              item?.options?.A || ""
            ).trim(),

            B: String(
              item?.options?.B || ""
            ).trim(),

            C: String(
              item?.options?.C || ""
            ).trim(),

            D: String(
              item?.options?.D || ""
            ).trim(),
          },

          answer: [
            "A",
            "B",
            "C",
            "D",
          ].includes(answer)
            ? answer
            : "A",

          explanation: String(
            item?.explanation || ""
          ).trim(),
        };
      })
      .filter(
        (item) =>
          item.question &&
          item.options.A &&
          item.options.B &&
          item.options.C &&
          item.options.D
      );

    // ============================================
    // VALIDATION
    // ============================================

    if (!questions.length) {
      return res.status(500).json({
        success: false,
        error:
          "Gemini से valid MCQ प्राप्त नहीं हुए।",
      });
    }

    // ============================================
    // SOURCES
    // ============================================

    const sources = [];

    const groundingChunks =
      geminiData
        ?.candidates?.[0]
        ?.groundingMetadata
        ?.groundingChunks;

    if (
      Array.isArray(groundingChunks)
    ) {
      groundingChunks.forEach(
        (chunk) => {
          const web =
            chunk?.web;

          if (
            web?.uri &&
            !sources.some(
              (item) =>
                item.url === web.uri
            )
          ) {
            sources.push({
              title:
                web.title ||
                web.uri,

              url: web.uri,
            });
          }
        }
      );
    }

    // ============================================
    // SUCCESS
    // ============================================

    return res.status(200).json({
      success: true,

      exam,

      topic,

      currentAffairs,

      date: currentDate,

      count: questions.length,

      model: lastModel,

      questions,

      sources,
    });

  } catch (error) {
    console.error(
      "MCQ API ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error?.message ||
        "Server में MCQ generate करते समय error आया।",
    });
  }
}
