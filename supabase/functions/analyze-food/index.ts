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

    let nutritionData = null;
    let identifiedFoodName = null;

    // Step 1: Try Lovable AI (Gemini) first - it's free and good for food identification
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (lovableApiKey) {
      try {
        console.log('Attempting Lovable AI (Gemini) for food identification...');
        const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Identify this food item. Respond with ONLY the name of the food in English (e.g., "apple", "banana", "rice", "chicken curry"). Be specific but concise - single word or two words maximum.'
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
            max_tokens: 50,
            temperature: 0.1
          }),
        });

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          identifiedFoodName = geminiData.choices[0].message.content.trim().toLowerCase();
          console.log('✓ Gemini identified food:', identifiedFoodName);
        } else {
          console.error('Gemini API error:', await geminiResponse.text());
        }
      } catch (error) {
        console.error('Gemini exception:', error);
      }
    }

    // Step 2: Try OpenAI Vision as backup (if quota available)
    if (!identifiedFoodName) {
      const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
      if (openAIApiKey) {
        try {
          console.log('Attempting OpenAI Vision as backup...');
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
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: 'Identify this food. Respond with ONLY the food name (e.g., "apple", "banana").'
                    },
                    {
                      type: 'image_url',
                      image_url: { url: imageData }
                    }
                  ]
                }
              ],
              max_tokens: 50,
              temperature: 0.1
            }),
          });

          if (visionResponse.ok) {
            const visionData = await visionResponse.json();
            identifiedFoodName = visionData.choices[0].message.content.trim().toLowerCase();
            console.log('✓ OpenAI identified food:', identifiedFoodName);
          } else {
            const errorText = await visionResponse.text();
            console.log('OpenAI quota exceeded or error:', errorText);
          }
        } catch (error) {
          console.error('OpenAI Vision exception:', error);
        }
      }
    }

    // Step 3: Get accurate nutrition from FatSecret using identified food
    if (identifiedFoodName) {
      console.log('Fetching nutrition data from FatSecret for:', identifiedFoodName);
      const fatSecretData = await getFatSecretNutrition(identifiedFoodName);
      if (fatSecretData) {
        nutritionData = fatSecretData;
        console.log('✓ FatSecret nutrition data retrieved successfully');
      } else {
        console.log('FatSecret lookup failed, trying common variations...');
        // Try variations (e.g., "apple" -> "apples", "red apple")
        const variations = [
          identifiedFoodName + 's',
          identifiedFoodName.replace(/s$/, ''),
          'raw ' + identifiedFoodName,
          'fresh ' + identifiedFoodName
        ];
        
        for (const variant of variations) {
          const variantData = await getFatSecretNutrition(variant);
          if (variantData) {
            nutritionData = variantData;
            console.log('✓ Found nutrition data using variant:', variant);
            break;
          }
        }
      }
    }

    // Step 4: If we have food name but no nutrition data, use Gemini for detailed analysis
    if (identifiedFoodName && !nutritionData && lovableApiKey) {
      try {
        console.log('Using Gemini for detailed nutrition analysis...');
        const detailResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `You are a nutrition expert. Provide ACCURATE nutritional data per 100g for the given food based on USDA/ICMR databases. Return ONLY valid JSON with this structure:
{
  "foodName": "food name",
  "calories": 52,
  "protein": 0.3,
  "carbs": 14,
  "fat": 0.2,
  "fiber": 2.4,
  "vitamins": [{"name": "Vitamin C", "amount": 4.6, "unit": "mg", "dailyValue": 8}],
  "minerals": [{"name": "Potassium", "amount": 107, "unit": "mg", "dailyValue": 2}],
  "deficiencyRisk": [],
  "profileAdvice": "advice",
  "culturalContext": "context"
}`
              },
              {
                role: 'user',
                content: `Provide accurate nutrition data for: ${identifiedFoodName} (per 100g serving)`
              }
            ],
            max_tokens: 1000,
            temperature: 0.1
          }),
        });

        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          const content = detailData.choices[0].message.content;
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            nutritionData = JSON.parse(jsonMatch[0]);
            console.log('✓ Gemini provided detailed nutrition data');
          }
        }
      } catch (error) {
        console.error('Gemini detail analysis error:', error);
      }
    }

    // Step 5: If all failed, return helpful error
    if (!nutritionData) {
      console.error('Could not retrieve nutrition data');
      return new Response(JSON.stringify({ 
        error: 'Unable to analyze food',
        details: identifiedFoodName 
          ? `Identified "${identifiedFoodName}" but could not retrieve nutrition data. FatSecret API may be unavailable.`
          : 'Could not identify the food in the image. Please try a clearer photo.'
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