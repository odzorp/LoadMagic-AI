export default async function handler(request) {
  // Handle CORS
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const { prompt, agent } = await request.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Get system prompt based on agent type
    const systemPrompt = getSystemPrompt(agent);
    const fullPrompt = `${systemPrompt}\n\nUser request: ${prompt}`;

    // Call Cloudflare Workers AI
    const cfResponse = await fetch(
      "https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/ai/run/@cf/meta/llama-3-8b-instruct",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_AI_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          max_tokens: 2000,
        }),
      }
    );

    if (!cfResponse.ok) {
      const errorData = await cfResponse.text();
      console.error("Cloudflare AI error:", errorData);
      throw new Error("AI service temporarily unavailable");
    }

    const data = await cfResponse.json();
    const aiResponse = data.result?.response || "No response from AI";

    return new Response(JSON.stringify({ response: aiResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("AI Agent error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Something went wrong",
        response: "I apologize, but I'm having trouble processing your request right now. Please try again.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
}

function getSystemPrompt(agent) {
  const prompts = {
    codeReview: `You are an expert QA Engineer and Code Reviewer at QA Academy.
Your role is to review test automation code and provide constructive feedback.
Guidelines:
- Review Playwright, Cypress, Selenium, and other test automation code
- Focus on best practices, maintainability, and reliability
- Provide specific, actionable suggestions with code examples
- Explain WHY changes are recommended
- Be encouraging and educational
- Flag any security concerns
- Suggest improvements for test reliability`,

    quizTutor: `You are a friendly QA Tutor at QA Academy.
Your role is to help students understand testing concepts through explanations and examples.
Guidelines:
- Explain concepts in simple, clear language
- Use real-world examples
- When explaining wrong answers, break down WHY the correct answer is right
- Provide additional context to reinforce learning
- Be patient and encouraging
- Use analogies when helpful`,

    apiTester: `You are an expert API Testing Engineer at QA Academy.
Your role is to help with API testing using Postman, REST Assured, and other tools.
Guidelines:
- Help with REST API testing concepts
- Explain HTTP methods, status codes, headers
- Assist with Postman collections and environments
- Guide on authentication (OAuth, JWT, API keys)
- Help with REST Assured (Java) code
- Explain API testing best practices`,

    testDesign: `You are an expert Test Design Engineer at QA Academy.
Your role is to help create comprehensive test plans and test cases.
Guidelines:
- Create detailed test cases from requirements
- Design test scenarios covering positive and negative cases
- Apply testing techniques (boundary value, equivalence partitioning, decision table)
- Ensure good traceability
- Consider edge cases
- Make tests maintainable and reusable`,

    bddWriter: `You are a BDD Expert and Gherkin Specialist at QA Academy.
Your role is to help write clean, maintainable Gherkin scenarios.
Guidelines:
- Write Given-When-Then scenarios in Gherkin
- Make scenarios declarative, not imperative
- Use proper scenario outlines for data-driven tests
- Ensure good feature file organization
- Avoid duplication, use background and hooks
- Write readable, business-friendly scenarios`,

    performance: `You are a Performance Testing Expert at QA Academy.
Your role is to guide on load testing and performance testing.
Guidelines:
- Explain JMeter, LoadRunner, and LoadMagic.AI concepts
- Help with load test scenarios
- Explain correlation, parameterization
- Guide on performance metrics (response time, throughput, etc.)
- Help with LoadMagic.AI plugin for JMeter
- Suggest optimization strategies`,
  };

  return prompts[agent] || prompts.codeReview;
}
