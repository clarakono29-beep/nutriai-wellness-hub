# NutriAI v2 — Complete Setup Guide

## What's New in This Version

### 🆕 New Features
| Feature | File | Status |
|---------|------|--------|
| USDA FoodData Central search (700K+ foods) | `supabase/functions/food-search/` | ✅ Built |
| Real barcode scanner (3M+ products via OpenFoodFacts) | `supabase/functions/barcode-lookup/` | ✅ Built |
| AI 7-day meal planner with shopping list | `supabase/functions/generate-meal-plan/` | ✅ Built |
| Stripe checkout + subscription billing | `supabase/functions/stripe-checkout/` | ✅ Built |
| Stripe webhook handler | `supabase/functions/stripe-webhook/` | ✅ Built |
| Stripe customer portal | `supabase/functions/customer-portal/` | ✅ Built |
| AI weekly nutrition insights | `supabase/functions/nutrition-insights/` | ✅ Built |
| Smart notification copy generator | `supabase/functions/smart-notifications/` | ✅ Built |
| Meal Plan page (`/app/mealplan`) | `src/routes/_authed/app.mealplan.tsx` | ✅ Built |
| Rebuilt pricing page with Stripe | `src/routes/pricing.tsx` | ✅ Built |
| Rebuilt food log with real USDA + barcode | `src/routes/_authed/app.log.tsx` | ✅ Built |
| Progress page with AI insights | `src/routes/_authed/app.progress.tsx` | ✅ Built |
| TDEE calculation library | `src/lib/tdee.ts` | ✅ Built |
| Micronutrient panel component | `src/components/progress/MicronutrientPanel.tsx` | ✅ Built |
| Nutrition insights hook | `src/hooks/useNutritionInsights.tsx` | ✅ Built |
| Meal plan hook | `src/hooks/useMealPlan.tsx` | ✅ Built |
| Food search hook (USDA + barcode) | `src/hooks/useFoodSearch.tsx` | ✅ Built |
| Enhanced subscription hook | `src/hooks/useSubscription.tsx` | ✅ Built |
| Database migration SQL | `supabase/migrations/20250428_nutriai_v2.sql` | ✅ Built |

---

## Step 1: Run the Database Migration

In Supabase Dashboard → SQL Editor, run the migration file:

```
supabase/migrations/20250428_nutriai_v2.sql
```

This adds:
- `stripe_customer_id` to `profiles` table
- `plan`, `trial_end`, `cancel_at_period_end` to `subscriptions` table
- New `meal_plans` table
- New `body_measurements` table
- New `food_favourites` table
- New `nutrition_insights` table

---

## Step 2: Set Supabase Edge Function Secrets

In the Supabase Dashboard → Edge Functions → Manage secrets, or via CLI:

```bash
# Required for AI features (already have this)
supabase secrets set LOVABLE_API_KEY=your_lovable_ai_key

# Optional — DEMO_KEY works but has rate limits (100 requests/hour/IP)
# Get a free key at https://fdc.nal.usda.gov/api-key-signup
supabase secrets set USDA_API_KEY=your_usda_api_key

# Required for Stripe billing
supabase secrets set STRIPE_SECRET_KEY=sk_live_...    # or sk_test_... for testing
supabase secrets set STRIPE_PRICE_MONTHLY=price_...   # Monthly plan price ID from Stripe
supabase secrets set STRIPE_PRICE_ANNUAL=price_...    # Annual plan price ID from Stripe
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...  # From Stripe webhook config
supabase secrets set APP_URL=https://your-domain.com  # Your production URL
```

---

## Step 3: Deploy New Edge Functions

```bash
# Deploy all new functions
supabase functions deploy food-search
supabase functions deploy barcode-lookup
supabase functions deploy generate-meal-plan
supabase functions deploy nutrition-insights
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook
supabase functions deploy customer-portal
supabase functions deploy smart-notifications
```

---

## Step 4: Configure Stripe

### 4a. Create Products & Prices

In your Stripe Dashboard → Products:

1. Create a product: **NutriAI Pro**
2. Add two prices:
   - **Monthly**: $7.99/month → copy the Price ID → `STRIPE_PRICE_MONTHLY`
   - **Annual**: $49.99/year ($4.17/mo) → copy the Price ID → `STRIPE_PRICE_ANNUAL`

### 4b. Configure Webhooks

In Stripe Dashboard → Webhooks → Add endpoint:

- URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
- Events to listen for:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `checkout.session.completed`
- Copy the signing secret → `STRIPE_WEBHOOK_SECRET`

### 4c. Enable Customer Portal

In Stripe Dashboard → Settings → Customer portal:
- Enable "Allow customers to cancel subscriptions"
- Set your business name and return URL

---

## Step 5: Push to Git + Deploy via Lovable

```bash
cd nutriai-wellness-hub-improved

# Copy improved files back to your repo (or push directly)
git add .
git commit -m "feat: v2 — real USDA food search, barcode scanner, AI meal planner, Stripe billing"
git push origin main
```

Then in Lovable:
1. Open your project
2. Click "Sync from GitHub"  
3. Lovable will pick up all the new routes and regenerate the routeTree

---

## Step 6: Get Your USDA API Key (Free)

1. Visit: https://fdc.nal.usda.gov/api-key-signup.html
2. Fill in your email — key arrives instantly
3. Set it: `supabase secrets set USDA_API_KEY=your_key`

With the DEMO_KEY you're limited to ~100 requests/hour per IP. The free personal key gives you 3,600 requests/hour — plenty for an app.

---

## Environment Variables Summary

| Variable | Where to get it | Required |
|----------|----------------|----------|
| `LOVABLE_API_KEY` | Lovable workspace settings | ✅ Yes (already set) |
| `USDA_API_KEY` | fdc.nal.usda.gov | ⚡ Recommended |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → API keys | ✅ For billing |
| `STRIPE_PRICE_MONTHLY` | Stripe Dashboard → Products | ✅ For billing |
| `STRIPE_PRICE_ANNUAL` | Stripe Dashboard → Products | ✅ For billing |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks | ✅ For billing |
| `APP_URL` | Your production domain | ✅ For billing |
| `SUPABASE_URL` | Auto-injected by Supabase | ✅ (auto) |
| `SUPABASE_ANON_KEY` | Auto-injected by Supabase | ✅ (auto) |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected by Supabase | ✅ (auto) |

---

## New Navigation Structure

```
/                     → Landing page
/signin               → Auth
/pricing              → New Stripe-powered pricing page
/app                  → Diary (home)
/app/log              → Add food (AI + Photo + USDA Search + Barcode)
/app/progress         → Progress + AI insights
/app/mealplan         → NEW: AI 7-day meal planner (Pro only)
/app/recipes          → Recipe library
/app/profile          → Profile + subscription management
```

---

## Testing the New Features

### Test USDA Food Search
1. Open `/app/log` → Search tab
2. Type "chicken breast" — should return real USDA data
3. Check that macros look accurate

### Test Barcode Scanner
1. Open `/app/log` → Scan tab
2. Type `5449000000996` (Coca-Cola) → should find the product
3. Alternatively use the camera on a real product

### Test Meal Plan (requires Pro subscription)
1. Subscribe (use Stripe test card: 4242 4242 4242 4242)
2. Open `/app/mealplan`
3. Click "Generate 7-day meal plan"

### Test Stripe Checkout (test mode)
- Use card: `4242 4242 4242 4242`, any future date, any CVC
- Should redirect to Stripe Checkout, then back to `/app?checkout=success`

---

## Architecture Notes

### Why USDA FoodData Central?
- 100% free, government-maintained
- 700,000+ foods with complete nutrient profiles
- Foundation/SR Legacy data is peer-reviewed and accurate
- No rate limits on the personal API key tier

### Why OpenFoodFacts for barcodes?
- 100% free, no API key needed
- 3+ million products with barcodes
- Open source community-maintained
- Returns Nutri-Score grades

### Why Supabase Edge Functions for food search?
- Keeps the API key server-side (secure)
- Handles CORS and data transformation
- Can cache results in future iterations

---

*Built with ❤️ by NutriAI engineering team*
