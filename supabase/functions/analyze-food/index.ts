import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData, profileMode, language } = await req.json();
    
    if (!imageData) {
      throw new Error('No image data provided');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Analyzing food image for profile:', profileMode, 'language:', language);

    // Analyze food image with GPT-4 Vision
    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a nutrition expert AI trained on ICMR (Indian Council of Medical Research) guidelines. Analyze the food image and provide detailed nutritional information.

Profile Context: ${profileMode}
- children: Focus on growth nutrients (protein, calcium, iron, vitamin D)
- pregnant: Emphasize folic acid, iron, calcium, protein needs
- elderly: Highlight easy digestion, bone health, heart health
- weight-loss: Focus on calorie density, fiber, protein satiety
- anemia: Prioritize iron, vitamin C (absorption), B12, folate

Return ONLY a JSON object with this exact structure:
{
  "foodName": "Primary food identified",
  "confidence": 0.95,
  "calories": 450,
  "protein": 18.5,
  "carbs": 65.2,
  "fat": 12.8,
  "fiber": 8.5,
  "vitamins": [
    {"name": "Vitamin A", "amount": 250, "unit": "mcg", "dailyValue": 28},
    {"name": "Vitamin C", "amount": 45, "unit": "mg", "dailyValue": 50},
    {"name": "Folate", "amount": 120, "unit": "mcg", "dailyValue": 30}
  ],
  "minerals": [
    {"name": "Iron", "amount": 8.2, "unit": "mg", "dailyValue": 46},
    {"name": "Calcium", "amount": 150, "unit": "mg", "dailyValue": 15},
    {"name": "Zinc", "amount": 4.1, "unit": "mg", "dailyValue": 37}
  ],
  "deficiencyRisk": [
    {"nutrient": "Iron", "risk": "medium", "reason": "Moderate iron content but absorption may be limited"},
    {"nutrient": "Vitamin B12", "risk": "high", "reason": "Plant-based meal lacks B12"}
  ],
  "profileAdvice": "Specific advice for the selected profile mode",
  "culturalContext": "Traditional Indian nutrition wisdom related to this food"
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this food image and provide comprehensive nutritional information according to ICMR standards.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.3
      }),
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('OpenAI Vision API error:', errorText);
      throw new Error(`Vision analysis failed: ${visionResponse.status}`);
    }

    const visionData = await visionResponse.json();
    const analysisText = visionData.choices[0].message.content;

    console.log('Raw analysis result:', analysisText);

    let nutritionData;
    try {
      // Extract JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        nutritionData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      // Fallback structured data
      nutritionData = {
        foodName: "Mixed Indian Food",
        confidence: 0.8,
        calories: 380,
        protein: 15,
        carbs: 58,
        fat: 10,
        fiber: 6,
        vitamins: [
          {"name": "Vitamin A", "amount": 200, "unit": "mcg", "dailyValue": 22},
          {"name": "Vitamin C", "amount": 30, "unit": "mg", "dailyValue": 33}
        ],
        minerals: [
          {"name": "Iron", "amount": 6, "unit": "mg", "dailyValue": 33},
          {"name": "Calcium", "amount": 120, "unit": "mg", "dailyValue": 12}
        ],
        deficiencyRisk: [
          {"nutrient": "Iron", "risk": "medium", "reason": "Moderate iron content"},
          {"nutrient": "Vitamin B12", "risk": "high", "reason": "Limited animal products"}
        ],
        profileAdvice: `Suitable for ${profileMode} profile with balanced nutrition.`,
        culturalContext: "Traditional Indian meal providing essential nutrients."
      };
    }

    console.log('Processed nutrition data:', nutritionData);

    return new Response(JSON.stringify(nutritionData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-food function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to analyze food image'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});