const OPENAI_KEY = process.env.OPENAI_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

if (!OPENAI_KEY) {
  console.error("❌ OPENAI_API_KEY is missing");
}

if (!GEMINI_KEY) {
  console.error("❌ GEMINI_API_KEY is missing");
}
# Copilot Instructions for antigravity-app

## Quickstart (Agents)
- **Next.js 16 App Router + TS + Supabase + AI (OpenAI/Gemini)**; core SKU management with AI extraction for eBay listings.
- **Key helpers**: `getServerSupabase()` ([app/utils/supabase/server.ts](app/utils/supabase/server.ts)), `requireAuth()` ([app/api/_lib/auth.ts](app/api/_lib/auth.ts)), `calculateProfit()` ([app/lib/profitCalculator.ts](app/lib/profitCalculator.ts)), `generateTextWithFallback()` ([app/api/_aiProviders.ts](app/api/_aiProviders.ts)), `getNextAction()` ([app/utils/getNextAction.ts](app/utils/getNextAction.ts)).
- **Core endpoints**: `/api/sku-list`, `/api/sku-edit`, `/api/extract-product-info`, `/api/auto-extract-product`, `/api/ai-title`, `/api/ai-description`, `/api/ai-description-ja`.
- **Dev**: `npm run dev` (Turbopack disabled via `NEXT_PRIVATE_TURBOPACK=0`); requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`.
- **Dev mode auth**: `requireAuth()` returns hardcoded `{ role: "admin", user: "dev-user" }` for local testing; production enforces metadata roles.

## Architecture Overview

### Core Data Flow
1. **Upload images** → SKU edit page stores images in Supabase bucket `product-images/{SKU}/{FOLDER}/` (RAW/ORIGINAL/LISTING/EDITED/THUMBNAIL).
2. **Auto-trigger AI extraction** ([app/api/sku-images/route.ts](app/api/sku-images/route.ts#L35-L37)) when RAW, ORIGINAL, and LISTING folders each contain ≥1 image; triggered by `POST /api/sku-images` (image upload handler).
3. **Extract metadata** via Vision API: genre, brand, model, condition, ebay_category_id, title_optimized, description, item_specifics.
4. **Operator review & edit** → `POST /api/sku-edit` saves all changes atomically, sets `ai_extracted_at` timestamp if core metadata fields change.
5. **Validation & readiness** → `checkListingReadiness()` ([app/lib/ebayListingReadiness.ts](app/lib/ebayListingReadiness.ts)) checks ≥7 LISTING images, title, description, category, condition, price.
6. **Export to eBay** → `/api/export-ebay-csv` and `/api/export-ebay-images` generate bulk upload assets.

### Key Tables & Schema
- **sku_list**: Main table — product metadata, pricing (`cost_price_jpy`, `sale_price_usd`, `sale_price_jpy`), AI fields (`brand`, `model`, `condition`, `ai_title`, `ai_description`, `item_specifics`, `ebay_category_id`), workflow state (`work_status`, `listing_status`, `deleted_at`).
- **activity_log**: Audit trail for significant actions (SKU edits, extractions, status changes).
- **eBay category schema**: See migrations in [app/migrations/](app/migrations/).

### SKU Format & Validation
- **Format**: `NEX-YYYYMMDD-A001` (date + letter + 3-digit sequence). Regex used in list sorting.
- **Soft delete**: All queries must filter `deleted_at IS NULL`.
- **Sorting**: Valid SKUs above invalid; within valid, newest first (by `created_at`).

## Backend Patterns — Critical for All Endpoints

### Supabase & Authentication
- **Always** use `getServerSupabase()` ([app/utils/supabase/server.ts](app/utils/supabase/server.ts)) — never instantiate ad-hoc clients.
- **Dev mode**: Auth disabled; `requireAuth()` returns hardcoded `admin` role. Production will enforce role validation.
- **Error handling**: Throw `{ status: 401, message: "認証が必要です" }` (no session) or `{ status: 403, message: "権限がありません" }` (invalid role).

### Field Whitelisting by Role
- **adminFields** (in [app/api/sku-list/route.ts](app/api/sku-list/route.ts#L45-L52)): Full access to pricing, fees, profit, shipping, category, conditions.
- **contractorFields**: Restricted to `sku`, `title`, `jp_description`, `condition_memo`, `work_status`, `image_count`.
- **Pattern**: Deserialize request, separate by role, filter response. Apply to ALL field-returning endpoints.
- **Implementation**: Build allowlist array per role, iterate response object, copy only whitelisted keys to output.
- **Never expose admin fields to contractors.**

### Profit Calculation & Judgment
- **Input**: `ProfitCalculationInput` (selling price USD/JPY, shipping cost, eBay fees, Payoneer costs, purchase/domestic shipping costs).
- **Call**: `calculateProfit(input)` → returns `ProfitCalculationResult` with `netProfitJPY` and `profitRate`.
- **Classify**: `judgeProfit(profitRate)` → `"ok"` (≥10%), `"warning"` (5–10%), `"ng"` (<5%), `"unset"` (undefined).
- **Defaults**: [app/lib/profitCalculator.ts](app/lib/profitCalculator.ts) exports `DEFAULT_PROFIT_SETTINGS` (exchange rates, fee percentages).

### Logging & Audit
- **Call**: `logApi({ sku_id, user_id, action, model? })` ([app/api/_lib/log.ts](app/api/_lib/log.ts)).
- **Records**: SKU creates, updates, deletes, AI extractions, status transitions.
- **Stored in**: `activity_log` table with `executed_at` timestamps.

### API Response Format
- **Always**: `NextResponse.json(data)` or `NextResponse.json(error, { status })`.
- **Status codes**: `400` (bad input), `401` (not authenticated), `403` (forbidden), `404` (not found), `500` (server error).
- **Examples**: List endpoints return array; detail endpoints wrap in `data` key or spread fields.

## AI Integration & Text Generation

### Provider System
- **Multi-provider**: [app/api/_aiProviders.ts](app/api/_aiProviders.ts) uses `generateTextWithFallback()`.
- **Preferred order**: Gemini (default) → OpenAI on failure. Set `preferred: "openai"` to reverse.
- **Fallback triggers**: Rate-limits, timeouts, API errors. User-input errors (bad prompts) → no fallback.
- **Response**: `{ ok: true, text, provider, model, fallbackUsed, details }` or `{ ok: false, message, providerTried }`.
- **Models**: `OPENAI_MODEL=gpt-4o-mini` (default), `GEMINI_MODEL=gemini-1.5-flash` (default).

### Vision Extraction Endpoints
- **POST `/api/extract-product-info`**: Takes `imageUrl`, `sku`; extracts: genre, brand, model, color, condition, ebay_category_id, title_optimized, description, item_specifics.
- **POST `/api/auto-extract-product`**: Triggered on SKU edit if RAW/ORIGINAL/LISTING folders ready. Fetches first RAW image, generates signed URL (30min), calls extract endpoint.
- **POST `/api/ai-title`, `/api/ai-description`, `/api/ai-description-ja`**: Text generation. Use `generateTextWithFallback()` with tailored prompts.

### Text Generation Patterns
- **Args**: `{ prompt, preferred?: "openai" | "gemini", temperature?: 0.4, maxTokens?: 400 }`.
- **Error handling**: Check `res.ok` before accessing `res.text`. Log `fallbackUsed` for observability.
- **Robust JSON parsing**: Handle markdown code blocks (`` ```json { ... } ``` ``). See [app/api/_aiProviders.ts](app/api/_aiProviders.ts) for `safeJson()` helper.

## Workflow & Next Action Logic

### Centralized Guidance
- **Helper**: `getNextAction()` ([app/utils/getNextAction.ts](app/utils/getNextAction.ts)) takes SKU object, returns `NextAction` (type, label, description).
- **Sequence**: Images → Title → Condition → Pricing → Profit → AI Title → AI Description → Listing Ready → Done.
- **Input contract**: `{ image_count, required_image_count, title, condition, cost_price, sell_price, profit, ai_title, ai_description, can_list }`.
- **UI consistency**: Populate `nextAction`, `actionReasons`, `needsAction` on all SKU responses so operators see unified guidance.

### Metadata Editing
- **Endpoint**: `POST /api/sku-edit` ([app/api/sku-edit/route.ts](app/api/sku-edit/route.ts)).
- **Behavior**: Accepts any field in body; if core metadata (genre, brand, model, category, pricing, profit) changes, sets `ai_extracted_at = now()`.
- **Core metadata keys**: `genre`, `brand`, `model`, `color`, `condition`, `title_optimized`, `description`, `item_specifics`, `profit_jpy`, `purchase_cost_jpy`, `ebay_category_id`.
- **Saves atomically**: All changes in one DB write.

## eBay Export & Listing

### Image Naming & Storage
- **Naming**: `{SKU}_{FOLDER}_{SEQ}.jpg` (e.g., `NEX-20251224-A005_LISTING_01.jpg`).
- **LISTING_01 is always main image**. No Japanese chars, spaces, or renames post-generation.
- **Storage path**: Supabase bucket `product-images/{SKU}/{FOLDER}/`.

### Condition & Category Mapping
- **Condition**: Map UI `sku_condition` (e.g., `"excellent"`) to eBay ConditionID (e.g., `3000`). See [app/lib/ebayNamingConvention.ts](app/lib/ebayNamingConvention.ts) `CONDITION_MAP`.
- **Category**: Store `ebay_category_id` (number). Fallback to `category_id` for legacy SKUs.
- **Selector**: UI provides hierarchical dropdown; fetch via `/api/ebay-categories`.

### Listing Readiness & Export
- **Validation**: `checkListingReadiness()` ([app/lib/ebayListingReadiness.ts](app/lib/ebayListingReadiness.ts)) → `{ isReady, missingItems, warnings }`.
- **Requirements**: ≥7 LISTING images (12 recommended), title, description, category, condition, `sale_price_jpy` or `sale_price_usd`.
- **CSV export**: `/api/export-ebay-csv` generates eBay bulk upload CSV.
- **Image ZIP**: `/api/export-ebay-images` creates ZIP grouped by SKU folder.
- **Full rules**: See [EBAY_LISTING_SPECIFICATION.md](EBAY_LISTING_SPECIFICATION.md).

## Implementation Guidelines

1. **Reuse existing helpers** — Don't reinvent: auth, logging, Supabase client, profit calc, next-action logic.
2. **Preserve SKU sorting** — Respect `NEX-YYYYMMDD-A001` regex; valid SKUs above invalid; newest first within valid.
3. **Field whitelisting on every endpoint** — Always separate `adminFields` and `contractorFields` based on role.
4. **Consistent API shapes** — Match existing patterns (`{ success, data }` or spread fields). Document deviations.
5. **Log significant actions** — Use `logApi()` for creates, updates, deletes, extractions, status transitions.
6. **Handle AI failures gracefully** — Check `response.ok`; log fallback usage; return user-friendly error messages.
7. **Update extraction timestamp** — Set `ai_extracted_at = now()` when core metadata fields change in edit endpoint.
8. **Atomic saves** — Combine related updates in single DB write (e.g., `/api/sku-edit` handles all SKU fields together).

## Common Patterns & Gotchas

- **Empty string → null conversion**: In `/api/sku-edit`, convert empty strings to `null` before saving to DB (`body.field === "" ? null : body.field`).
- **Category validation**: When setting `ebay_category_id`, validate it exists in `ebay_categories` table; set to `null` if not found.
- **Image count fallback**: UI may show stale `image_count`; verify via Supabase storage bucket listing as fallback.
- **Signed URLs for Vision API**: Generate 30-minute signed URLs when calling Vision endpoints; cache signatures if multiple calls needed.
- **Soft-delete queries**: EVERY query filtering SKU records must include `.is("deleted_at", null)` to exclude deleted items.
- **Metadata extraction trigger**: Auto-extraction only runs if RAW, ORIGINAL, AND LISTING folders each have ≥1 image (AND logic, not OR).
