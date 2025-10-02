import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FatSecret API helper functions
async function getFatSecretNutrition(foodName: string) {
  const clientId = Deno.env.get('FATSECRET_CLIENT_ID');
  const clientSecret = Deno.env.get('FATSECRET_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    console.log('FatSecret credentials not available');
    return null;
  }

  try {
    // Get OAuth 2.0 token
    const tokenResponse = await fetch('https://oauth.fatsecret.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
      },
      body: 'grant_type=client_credentials&scope=basic'
    });

    if (!tokenResponse.ok) {
      console.error('Failed to get FatSecret token');
      return null;
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Search for food
    const searchUrl = `https://platform.fatsecret.com/rest/foods/search/v1?query=${encodeURIComponent(foodName)}&format=json`;
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!searchResponse.ok) {
      console.error('FatSecret search failed');
      return null;
    }

    const searchData = await searchResponse.json();
    
    if (searchData.foods?.food?.length > 0) {
      const food = searchData.foods.food[0];
      
      // Get detailed nutrition info
      const detailUrl = `https://platform.fatsecret.com/rest/food/v4?food_id=${food.food_id}&format=json`;
      const detailResponse = await fetch(detailUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        return parseFatSecretNutrition(detailData.food, foodName);
      }
    }
    
    return null;
  } catch (error) {
    console.error('FatSecret API error:', error);
    return null;
  }
}

function parseFatSecretNutrition(foodData: any, foodName: string) {
  try {
    const serving = foodData.servings?.serving?.[0] || foodData.servings?.serving;
    if (!serving) return null;

    return {
      foodName: foodData.food_name || foodName,
      confidence: 0.85,
      calories: parseFloat(serving.calories) || 0,
      protein: parseFloat(serving.protein) || 0,
      carbs: parseFloat(serving.carbohydrate) || 0,
      fat: parseFloat(serving.fat) || 0,
      fiber: parseFloat(serving.fiber) || 0,
      vitamins: [
        {"name": "Vitamin A", "amount": parseFloat(serving.vitamin_a) || 0, "unit": "IU", "dailyValue": 0},
        {"name": "Vitamin C", "amount": parseFloat(serving.vitamin_c) || 0, "unit": "mg", "dailyValue": 0}
      ],
      minerals: [
        {"name": "Iron", "amount": parseFloat(serving.iron) || 0, "unit": "mg", "dailyValue": 0},
        {"name": "Calcium", "amount": parseFloat(serving.calcium) || 0, "unit": "mg", "dailyValue": 0},
        {"name": "Sodium", "amount": parseFloat(serving.sodium) || 0, "unit": "mg", "dailyValue": 0}
      ],
      deficiencyRisk: [],
      profileAdvice: generateProfileAdvice(foodName, serving),
      culturalContext: `${foodName} provides essential nutrients from accurate nutrition database.`
    };
  } catch (error) {
    console.error('Error parsing FatSecret data:', error);
    return null;
  }
}

function generateProfileAdvice(foodName: string, serving: any): string {
  const protein = parseFloat(serving.protein) || 0;
  const calories = parseFloat(serving.calories) || 0;
  
  if (protein > 10) {
    return `${foodName} is a good source of protein with ${protein}g per serving.`;
  } else if (calories < 100) {
    return `${foodName} is a low-calorie option with ${calories} calories per serving.`;
  }
  
  return `${foodName} provides ${calories} calories and ${protein}g protein per serving.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData, profileMode, language } = await req.json();
    
    if (!imageData) {
      throw new Error('No image data provided');
    }

    console.log('Analyzing food image for profile:', profileMode, 'language:', language);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    let nutritionData = null;
    let identifiedFoodName = null;

    // Step 1: Use OpenAI Vision to identify the food accurately
    if (openAIApiKey) {
      try {
        console.log('Attempting OpenAI Vision API call...');
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
                content: `You are a precise nutrition expert. Analyze the food image and provide ACCURATE nutritional data per 100g serving.

CRITICAL: Return exact, real-world nutritional values based on USDA/ICMR databases. Do not invent or approximate values.

For each food item, provide:
- Exact name of the food item
- Accurate calories, protein, carbs, fat, fiber per 100g
- Real vitamin and mineral content with proper units
- Profile-specific advice for: ${profileMode}

Return ONLY valid JSON with this structure:
{
  "foodName": "exact food name",
  "confidence": 0.95,
  "servingSize": "100g",
  "calories": 52,
  "protein": 0.3,
  "carbs": 14,
  "fat": 0.2,
  "fiber": 2.4,
  "vitamins": [
    {"name": "Vitamin A", "amount": 54, "unit": "IU", "dailyValue": 1},
    {"name": "Vitamin C", "amount": 4.6, "unit": "mg", "dailyValue": 8},
    {"name": "Folate", "amount": 3, "unit": "mcg", "dailyValue": 1}
  ],
  "minerals": [
    {"name": "Potassium", "amount": 107, "unit": "mg", "dailyValue": 2},
    {"name": "Calcium", "amount": 6, "unit": "mg", "dailyValue": 1},
    {"name": "Iron", "amount": 0.12, "unit": "mg", "dailyValue": 1}
  ],
  "deficiencyRisk": [],
  "profileAdvice": "specific advice for the profile",
  "culturalContext": "relevant context"
}`
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Identify this food and provide ACCURATE nutritional information per 100g serving. Use real database values, not estimates.'
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
            max_tokens: 2000,
            temperature: 0.1
          }),
        });

        if (visionResponse.ok) {
          const visionData = await visionResponse.json();
          const analysisText = visionData.choices[0].message.content;
          console.log('OpenAI raw response:', analysisText);

          // Extract JSON from markdown code blocks or plain text
          let jsonText = analysisText;
          const codeBlockMatch = analysisText.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (codeBlockMatch) {
            jsonText = codeBlockMatch[1];
          } else {
            const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              jsonText = jsonMatch[0];
            }
          }

          try {
            nutritionData = JSON.parse(jsonText.trim());
            identifiedFoodName = nutritionData.foodName;
            console.log('✓ OpenAI analysis successful for:', identifiedFoodName);
            console.log('Nutrition data:', JSON.stringify(nutritionData, null, 2));
          } catch (parseError) {
            console.error('Failed to parse OpenAI JSON response:', parseError);
            console.error('Raw text was:', jsonText);
          }
        } else {
          const errorText = await visionResponse.text();
          console.error('OpenAI Vision API error status:', visionResponse.status);
          console.error('OpenAI error details:', errorText);
        }
      } catch (error) {
        console.error('OpenAI Vision exception:', error);
      }
    } else {
      console.log('OpenAI API key not available');
    }

    // Step 2: If OpenAI failed, try FatSecret with identified food name
    if (!nutritionData && identifiedFoodName) {
      console.log('Attempting FatSecret API with identified food:', identifiedFoodName);
      const fatSecretData = await getFatSecretNutrition(identifiedFoodName);
      if (fatSecretData) {
        nutritionData = fatSecretData;
        console.log('✓ FatSecret data retrieved successfully');
      }
    }

    // Step 3: If both failed, return error - don't give fake data
    if (!nutritionData) {
      console.error('All nutrition APIs failed');
      return new Response(JSON.stringify({ 
        error: 'Unable to analyze food',
        details: 'Could not retrieve accurate nutritional information. Please ensure API keys are configured correctly.'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhance with profile-specific advice
    const profileAdviceMap: Record<string, string> = {
      'pregnant': 'Focus on folic acid, iron, and calcium. Consult your healthcare provider.',
      'anemia': 'Pair iron-rich foods with vitamin C sources for better absorption.',
      'children': 'Ensure adequate protein, calcium, and vitamins for growth.',
      'elderly': 'Focus on easily digestible, nutrient-dense foods.',
      'weight-loss': 'Monitor portion sizes and choose low-calorie, high-fiber options.'
    };

    if (profileMode && profileAdviceMap[profileMode]) {
      nutritionData.profileAdvice = `${nutritionData.profileAdvice || ''} ${profileAdviceMap[profileMode]}`.trim();
    }

    console.log('✓ Final nutrition data returned:', nutritionData.foodName);

    return new Response(JSON.stringify(nutritionData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Critical error in analyze-food function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to analyze food image'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});