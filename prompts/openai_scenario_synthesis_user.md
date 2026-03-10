Generate a complete sales scenario JSON with this exact structure:

{
  "client_profile": {
    "name": "{{client_name}}",
    "size": "<e.g. 800-1,200 employees>",
    "budget_cycle": "<e.g. Q3 annual review>",
    "decision_timeline": "<e.g. 8-10 weeks>",
    "buyer_persona": "<primary decision-maker role>"
  },
  "value_proposition": "<2-3 sentence pitch tailored to this client>",
  "buying_constraints": [
    "<constraint 1>",
    "<constraint 2>",
    "<constraint 3>",
    "<constraint 4>"
  ],
  "objections": [
    {
      "id": "1",
      "title": "<short objection label>",
      "detail": "<1-2 sentence expansion of why the buyer raises this>",
      "difficulty": "<easy|medium|hard>"
    }
  ]
}

Original user input:
- Company: {{client_name}}
- Sector: {{sector}}
- Requirements / pain points: {{requirements}}

Perplexity client research:
{{client_research_json}}

Requirements:
- Make the scenario clearly reflect the researched company context.
- Keep the value proposition aligned to the user's offer and pain points.
- Generate exactly 4 or 5 realistic objections.
- Ensure the buying constraints are concrete and meeting-ready.
- Return JSON only.
