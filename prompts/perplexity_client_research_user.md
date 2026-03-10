Research this target client and return JSON with the exact structure below:

{
  "summary": "<2-3 sentence overview of the company and why this account matters>",
  "key_facts": [
    "<specific fact relevant to the account>"
  ],
  "strategic_priorities": [
    "<priority grounded in public information or prefixed with 'Inference:'>"
  ],
  "potential_pain_points": [
    "<likely pain point relevant to the offer, grounded in sources or prefixed with 'Inference:'>"
  ],
  "sources": [
    {
      "title": "<short source title>",
      "url": "<https://...>"
    }
  ]
}

Target client:
- Company: {{client_name}}
- Sector: {{sector}}
- Offer or context to keep in mind: {{requirements}}

Requirements:
- Include 4-6 `key_facts`.
- Include 3-5 `strategic_priorities`.
- Include 3-5 `potential_pain_points`.
- Include 2-5 credible `sources`.
- If the company has limited public information, say so in `summary` and use clearly labeled inferences.
- Return JSON only.
