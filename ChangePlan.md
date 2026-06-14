# ESNeelan / BIDSTREAM — Design Change & Feature Implementation Documentation

> For Cursor AI — Full scope of missing features, schema changes, and UI updates required to align the app with the Neelan Featured Bid Process Flow specification.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Gap Analysis — What's Missing](#2-gap-analysis)
3. [Database Schema Changes](#3-database-schema-changes)
4. [New Status Flow](#4-new-status-flow)
5. [New & Changed Screens](#5-new--changed-screens)
6. [New RPCs / Edge Functions](#6-new-rpcs--edge-functions)
7. [Notification System Expansion](#7-notification-system-expansion)
8. [File-by-File Change List](#8-file-by-file-change-list)
9. [Implementation Order](#9-implementation-order)

---

## 1. Executive Summary

The current codebase is a working MVP auction platform. However, it is missing the entire **Featured Bid** flow specified by the Neelan process document, including:

- A multi-step seller listing flow (Bid Details → T&C → Payment Proof)
- Featured listing fee payment & proof upload (MVR 150 to Feridhoo Holdings)
- Unique **Bid Number** and **Communication Code** generation per auction
- Winner **consent** gate before seller receives contact details
- Seller **bid closure form** with next-winner cascade
- Buyer **feedback + seller rating** after transaction
- Extended auction status machine (`awaiting_winner_consent`, `payment_stage`, `awaiting_payment`)
- Admin **payment verification** workflow
- Seller phone number exposure to winner (post-consent)
- Second/third winner selection cascade

---

## 2. Gap Analysis

### 2.1 Missing Database Columns

| Table      | Missing Column                            | Purpose                                    |
| ---------- | ----------------------------------------- | ------------------------------------------ |
| `auctions` | `bid_type` (enum: `standard`, `featured`) | Distinguish listing type                   |
| `auctions` | `bid_number` (text, unique)               | Human-readable bid ID e.g. `BID-00123`     |
| `auctions` | `communication_code` (text, unique)       | Secure code for buyer/seller comms         |
| `auctions` | `listing_fee_paid` (boolean)              | Track MVR 150 payment                      |
| `auctions` | `listing_fee_proof_path` (text)           | Storage path for payment screenshot        |
| `auctions` | `winner_position` (int)                   | Which attempt: 1st, 2nd, 3rd winner        |
| `auctions` | `seller_phone` (text)                     | Denormalized for winner notification       |
| `profiles` | `phone` already exists ✓                  | —                                          |
| `auctions` | `winner_consent_given` (boolean)          | Has winner accepted terms + shared contact |
| `auctions` | `winner_contacted_at` (timestamptz)       | When seller received winner contact        |

### 2.2 Missing Status Values

Current `auction_status` enum is missing:

- `awaiting_payment` — fee submitted, pending admin verification
- `awaiting_winner_consent` — auction closed, waiting for winner to accept
- `payment_stage` — winner consented, seller can contact

### 2.3 Missing Tables

| Table                     | Purpose                                                     |
| ------------------------- | ----------------------------------------------------------- |
| `auction_closure_reports` | Seller's bid closure form submission                        |
| `seller_ratings`          | Buyer's post-transaction rating (1–5 stars + feedback type) |
| `winner_cascade`          | Tracks position 1→2→3 winner selection history              |

### 2.4 Missing Screens / UI Flows

| Screen                                          | Status                                        |
| ----------------------------------------------- | --------------------------------------------- |
| Multi-step Create Auction (Step 1: Details)     | Partial — `create.tsx` exists but single-step |
| Create Auction Step 2: Terms & Conditions       | ❌ Missing                                    |
| Create Auction Step 3: Payment Proof Upload     | ❌ Missing                                    |
| Admin: Payment Verification                     | ❌ Missing                                    |
| Admin: Generate Bid Number + Communication Code | ❌ Missing                                    |
| Winner: Consent Screen                          | ❌ Missing                                    |
| Seller: Bid Closure Form                        | ❌ Missing                                    |
| Buyer: Post-Transaction Feedback + Rating       | ❌ Missing                                    |
| Seller: Winner Info Reveal (post-consent)       | ❌ Missing                                    |
| Admin: Next Winner Selection                    | ❌ Missing                                    |
| Notifications: In-app notification center       | ❌ Missing (outbox exists but no UI)          |

### 2.5 Missing Logic

- Bid Number auto-generation on approval (`BID-XXXXX`)
- Communication Code generation (UUID-based short code)
- Winner consent flow with contact reveal gate
- Seller closure form triggering next-winner cascade
- Rating aggregation on seller profile

---

## 3. Database Schema Changes

### 3.1 New Migration File

**`supabase/migrations/20250523000001_featured_bid_flow.sql`**

```sql
-- ============================================================
-- STEP 1: Extend auction_status enum
-- ============================================================
ALTER TYPE public.auction_status ADD VALUE IF NOT EXISTS 'awaiting_payment';
ALTER TYPE public.auction_status ADD VALUE IF NOT EXISTS 'awaiting_winner_consent';
ALTER TYPE public.auction_status ADD VALUE IF NOT EXISTS 'payment_stage';

-- ============================================================
-- STEP 2: Extend bid_type
-- ============================================================
CREATE TYPE public.bid_type AS ENUM ('standard', 'featured');

-- ============================================================
-- STEP 3: Extend auctions table
-- ============================================================
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS bid_type         public.bid_type NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS bid_number       TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS communication_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS listing_fee_paid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS listing_fee_proof_path TEXT,
  ADD COLUMN IF NOT EXISTS winner_consent_given BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS winner_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS winner_position  INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS seller_phone     TEXT;

-- ============================================================
-- STEP 4: Auction closure reports (Seller's form)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.auction_closure_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id      UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  seller_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  outcome         TEXT NOT NULL CHECK (outcome IN (
                    'completed',
                    'cancelled_no_payment',
                    'cancelled_terms_disagreement'
                  )),
  notes           TEXT,
  select_next     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX closure_reports_auction_idx ON public.auction_closure_reports(auction_id);

-- ============================================================
-- STEP 5: Seller ratings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seller_ratings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id      UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  buyer_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stars           SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  feedback_type   TEXT NOT NULL CHECK (feedback_type IN (
                    'completed_happy',
                    'not_proceed_terms',
                    'not_proceed_quality'
                  )),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(auction_id, buyer_id)
);

CREATE INDEX ratings_seller_idx ON public.seller_ratings(seller_id);

-- ============================================================
-- STEP 6: Winner cascade tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS public.winner_cascade (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id      UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position        INTEGER NOT NULL,
  notified_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  consented_at    TIMESTAMPTZ,
  skipped_at      TIMESTAMPTZ,
  closure_outcome TEXT
);

CREATE INDEX winner_cascade_auction_idx ON public.winner_cascade(auction_id, position);

-- ============================================================
-- STEP 7: Bid number sequence
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS public.bid_number_seq START 10000;

-- ============================================================
-- STEP 8: RLS on new tables
-- ============================================================
ALTER TABLE public.auction_closure_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winner_cascade ENABLE ROW LEVEL SECURITY;

-- Closure reports: seller sees own, admin sees all
CREATE POLICY closure_reports_select ON public.auction_closure_reports
  FOR SELECT USING (seller_id = auth.uid() OR public.is_admin());
CREATE POLICY closure_reports_insert ON public.auction_closure_reports
  FOR INSERT WITH CHECK (seller_id = auth.uid());

-- Ratings: public read, buyer inserts own
CREATE POLICY ratings_select ON public.seller_ratings FOR SELECT USING (true);
CREATE POLICY ratings_insert ON public.seller_ratings
  FOR INSERT WITH CHECK (buyer_id = auth.uid());

-- Winner cascade: participant or admin
CREATE POLICY winner_cascade_select ON public.winner_cascade
  FOR SELECT USING (
    bidder_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.auctions a WHERE a.id = auction_id AND a.seller_id = auth.uid())
    OR public.is_admin()
  );
```

### 3.2 Storage Changes

Add a new bucket for payment proof uploads.

**`supabase/migrations/20250523000002_payment_proof_storage.sql`**

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Only auction owner can upload to their own auction path
CREATE POLICY payment_proof_upload ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'payment-proofs'
    AND auth.role() = 'authenticated'
    AND split_part(name, '/', 1) IN (
      SELECT id::text FROM public.auctions WHERE seller_id = auth.uid()
    )
  );

-- Admin and owner can read
CREATE POLICY payment_proof_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payment-proofs'
    AND (
      public.is_admin()
      OR split_part(name, '/', 1) IN (
        SELECT id::text FROM public.auctions WHERE seller_id = auth.uid()
      )
    )
  );
```

---

## 4. New Status Flow

The auction status machine must be updated to match the specification exactly.

```
draft
  └─► pending_approval          (seller submits)
        └─► awaiting_payment    (admin marks "needs fee" for featured)
              └─► active        (admin verifies payment + approves)

  OR for standard:
        └─► active              (admin approves directly)

active
  └─► awaiting_winner_consent   (auction ends, winner notified)
        └─► payment_stage       (winner gives consent)
              └─► completed     (seller closure form: "Transaction Closed")
              └─► cancelled     (seller closure form: cancel reasons)
              └─► [next winner] (seller selects next bidder → awaiting_winner_consent)

active → cancelled              (admin or seller pre-close — featured: restricted)
pending_approval → cancelled    (admin rejects)
```

### Status Display Labels (UI)

| DB Status                 | Display Label                  |
| ------------------------- | ------------------------------ |
| `draft`                   | Draft                          |
| `pending_approval`        | Pending Approval               |
| `awaiting_payment`        | Awaiting Fee Payment           |
| `active`                  | Live                           |
| `awaiting_winner_consent` | Awaiting Winner                |
| `payment_stage`           | Payment Stage                  |
| `won`                     | (legacy, map to payment_stage) |
| `paid`                    | (legacy, map to completed)     |
| `completed`               | Completed                      |
| `cancelled`               | Cancelled                      |
| `ended`                   | Ended (no bids)                |

---

## 5. New & Changed Screens

### 5.1 Create Auction — Multi-Step Flow

**Replace `app/(tabs)/create.tsx` with a wizard.**

The current single-form screen must become a 3-step wizard stored in a new directory:

```
app/
  create/
    _layout.tsx          ← Stack layout, no header
    step1-details.tsx    ← Bid Details form
    step2-terms.tsx      ← T&C acceptance
    step3-payment.tsx    ← Fee payment (featured only)
```

#### Step 1 — `app/create/step1-details.tsx`

Fields (map to existing `auctions` columns):

- Item Name → `title` (required)
- Item Description → `description` (optional)
- Category → `category_id`
- Starting Price (MVR) → `starting_price`
- Bid Increment Amount → `min_bid_increment`
- Bid Start Time → `starts_at` (DateTimePicker)
- Bid End Time → `ends_at` (DateTimePicker)
- **Bid Type** → `bid_type` (radio: Standard | Featured)
- Location → `location`
- Photos → `auction_images`
- Payment Instructions → `payment_instructions`

On "Continue": validate all required fields, save draft via Supabase insert, navigate to Step 2.

State management: Store `auctionId` in React state passed via router params.

#### Step 2 — `app/create/step2-terms.tsx`

Display the full T&C text (hardcoded string, see spec). The exact clauses to show:

```
Terms to display (verbatim from spec):
1. Neelan only acts as a platform connecting buyers and sellers
2. Neelan is not responsible for payment, delivery, returns, or transaction disputes
3. The seller is responsible for ensuring that the product matches the description
4. All payment and delivery instructions shared with the winning bidder must include the official bid communication code
5. Once a bid goes live the seller cannot cancel the bid [exceptions listed]
6. Providing incorrect information may result in the bidder being blacklisted
7. The platform reserves the right to provide information to law enforcement
```

UI requirements:

- `ScrollView` with all clauses rendered as `TextBody` items
- A `Checkbox` component (new) at bottom: "I agree and wish to proceed"
- "Agree and Proceed" `ButtonPrimary` — disabled until checkbox ticked
- "Back" `ButtonSecondary`

On proceed:

- If `bid_type === 'featured'`: navigate to Step 3
- If `bid_type === 'standard'`: call `submit_auction_for_approval` RPC, navigate to `/my-auctions`

#### Step 3 — `app/create/step3-payment.tsx` (Featured only)

Display:

```
Featured Listing Fee: MVR 150
Account Number: [configured in env or admin settings]
Account Name: Feridhoo Holdings
```

UI requirements:

- Info card showing payment details
- "Upload Payment Proof" button → `ImagePicker` → upload to `payment-proofs` bucket
- Preview thumbnail of uploaded image
- "Submit for Approval" `ButtonPrimary` — disabled until proof uploaded
- On submit: update `listing_fee_proof_path` on auction, call `submit_auction_for_approval`

New component needed: **`src/components/ui/Checkbox.tsx`**

```tsx
// Checkbox component skeleton
type Props = {
  checked: boolean;
  onToggle: () => void;
  label: string;
};
export function Checkbox({ checked, onToggle, label }: Props) { ... }
```

---

### 5.2 Admin Screens — Extended

#### `app/admin/pending.tsx` — Extended

Current screen shows approve/reject. Must also:

1. **Show bid type badge** — "FEATURED" or "STANDARD"
2. **For featured listings**: show "View Payment Proof" button → open image from storage
3. **For featured listings**: show "Verify Payment" button which:
   - Sets `listing_fee_paid = true`
   - Sets status to `active`
   - Generates `bid_number` and `communication_code`
   - Sends seller notification with bid number and code
4. **For standard listings**: existing approve flow sets status to `active` directly (but must also generate `bid_number` and `communication_code` on approval)

**New RPC needed**: `admin_approve_auction` must be updated to generate codes.

#### `app/admin/auction-detail.tsx` (NEW)

Admin drill-down screen for any auction. Shows:

- Full auction details
- All bids with bidder names
- Current winner + consent status
- Payment proof image (featured)
- Closure report (if submitted)
- Actions: Force close, Select next winner, Mark completed

Route: `app/admin/auction/[id].tsx`

#### `app/admin/index.tsx` — Extended

Add new quick-action buttons:

- "Payment Verifications" (count badge showing pending featured listings)
- "Awaiting Closure" (count of `payment_stage` auctions)

---

### 5.3 Auction Detail Screen — Extended

**`app/auction/[id].tsx`** needs significant additions:

#### For Winners (status: `awaiting_winner_consent`)

Show a consent modal/section:

```
Congratulations! You have won this auction.
Bid No: [bid_number]
Item: [title]
Winning Amount: MVR [amount]
Position: [winner_position]

The seller will contact you on +960 [seller_phone].
Your communication code: [communication_code]

[Full legal disclaimer text from spec]

[ ] I agree to the platform terms
[ ] I consent to share my contact information with the seller

[Give Consent Button]
```

On consent: call new RPC `winner_give_consent` → status becomes `payment_stage`.

#### For Sellers (status: `payment_stage`)

Show winner info section (only visible after consent):

```
Your auction has reached payment stage!
Position: 1

Contact the winner on: +960 [winner_phone]
Communication Code: [communication_code]

[Submit Closure Form Button]
```

#### For Sellers (status: `awaiting_winner_consent`)

Show:

```
Waiting for winner to give consent...
[Bid No: BID-XXXXX]
[Communication Code: XXXXX]
```

#### Communication Code Display

Always visible to the auction seller (not publicly visible). Show in a styled callout box:

```
Your Bid Number: BID-10042
Communication Code: A7F2-KP9X
⚠️ Share this code ONLY with the winning bidder
```

---

### 5.4 Seller Bid Closure Form (NEW)

**`app/auction/closure/[id].tsx`**

Triggered by "Submit Closure Form" button on auction detail (seller view, `payment_stage` status).

Form fields:

- Outcome radio group:
  - ✅ Transaction Successfully Closed
  - ❌ Cancelled — Buyer failed to make payment on time
  - ❌ Cancelled — Both parties could not agree on terms
- Notes (optional text area)
- If outcome is cancelled: checkbox "Select next eligible bidder"
- "Submit" button

On submit: call `seller_submit_closure` RPC which:

1. Inserts `auction_closure_reports` record
2. If completed: sets status → `completed`, triggers buyer feedback request
3. If cancelled + `select_next = true`: triggers next winner selection cascade
4. If cancelled + `select_next = false`: sets status → `cancelled`

---

### 5.5 Winner Consent Screen (NEW)

**`app/auction/consent/[id].tsx`** or rendered inline on `app/auction/[id].tsx`

Full consent UI as described in section 5.3 above.

---

### 5.6 Buyer Feedback Screen (NEW)

**`app/auction/feedback/[id].tsx`**

Shown to buyer after auction reaches `completed` or `cancelled` status (where they were the winner).

Sections:

**A. Transaction Outcome**
Radio selection:

- ✅ Transaction completed — I'm happy with the transaction
- ❌ Chose not to proceed — seller's terms were not acceptable
- ❌ Chose not to proceed — product does not meet quality/specification

**B. Rate the Seller** (1–5 stars)

- Render 5 tappable star icons
- Selected stars turn yellow/accent
- Required before submitting

**C. Submit**

- Calls `buyer_submit_feedback` RPC

---

### 5.7 Notifications Screen (NEW)

**`app/notifications.tsx`**

Currently notification_outbox exists in DB but there is no UI. Add:

- Tab bar icon: "Notifications" (bell icon, show badge count)
- List view of `notification_outbox` rows for current user
- Each row shows: type label, auction title from payload, timestamp
- Tap to navigate to relevant auction
- Mark as read (add `read_at` column to `notification_outbox`)

Add to tab bar in `app/(tabs)/_layout.tsx`:

```tsx
<Tabs.Screen
  name="notifications"
  options={{
    title: "Alerts",
    tabBarIcon: ...,
    tabBarBadge: unreadCount || undefined,
  }}
/>
```

---

### 5.8 My Auctions Screen — Extended

**`app/my-auctions.tsx`** needs:

1. Show `bid_number` and `communication_code` for active/live auctions
2. Show "Submit Closure Form" button when status = `payment_stage`
3. Show correct status labels (see Status Display Labels table above)
4. Show winner info (post-consent) when status = `payment_stage`

---

## 6. New RPCs / Edge Functions

### 6.1 `admin_approve_auction` — Update Existing

**File: `supabase/migrations/20250523000003_updated_rpcs.sql`**

Update the existing `admin_approve_auction` RPC to also generate `bid_number` and `communication_code` on approval:

```sql
CREATE OR REPLACE FUNCTION public.admin_approve_auction(p_auction_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller UUID;
  v_bid_num TEXT;
  v_comm_code TEXT;
  v_auction public.auctions;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO v_auction
  FROM public.auctions
  WHERE id = p_auction_id AND status = 'pending_approval'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_transition');
  END IF;

  v_seller := v_auction.seller_id;

  -- Generate unique bid number: BID-XXXXX
  v_bid_num := 'BID-' || LPAD(nextval('public.bid_number_seq')::text, 5, '0');

  -- Generate communication code: 4-4 alphanumeric
  v_comm_code := UPPER(
    substring(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' ||
    substring(replace(gen_random_uuid()::text, '-', ''), 1, 4)
  );

  -- Populate seller_phone from profiles
  UPDATE public.auctions
  SET
    status = 'active',
    bid_number = v_bid_num,
    communication_code = v_comm_code,
    seller_phone = (SELECT phone FROM public.profiles WHERE id = v_seller),
    updated_at = now()
  WHERE id = p_auction_id;

  -- Notify seller with bid number and communication code
  INSERT INTO public.notification_outbox (user_id, type, payload)
  VALUES (
    v_seller,
    'listing_approved_with_codes',
    jsonb_build_object(
      'auction_id', p_auction_id,
      'title', v_auction.title,
      'bid_number', v_bid_num,
      'communication_code', v_comm_code
    )
  );

  RETURN jsonb_build_object('ok', true, 'bid_number', v_bid_num, 'communication_code', v_comm_code);
END;
$$;
```

### 6.2 `admin_verify_featured_payment` (NEW)

For admin to verify MVR 150 fee payment for featured listings:

```sql
CREATE OR REPLACE FUNCTION public.admin_verify_featured_payment(p_auction_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  UPDATE public.auctions
  SET listing_fee_paid = true, updated_at = now()
  WHERE id = p_auction_id AND bid_type = 'featured' AND status = 'awaiting_payment';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found_or_invalid');
  END IF;

  -- Now trigger approval
  RETURN public.admin_approve_auction(p_auction_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_verify_featured_payment(UUID) TO authenticated;
```

### 6.3 `close_expired_auctions` — Update Existing

After auctions close (end time passed), instead of setting status → `won`, set to `awaiting_winner_consent` and notify winner:

```sql
-- In the existing close_expired_auctions function, change:
-- status = 'won'
-- TO:
-- status = 'awaiting_winner_consent'

-- And update notification type from 'won_auction' to 'winner_consent_requested'
-- Add insert into winner_cascade table:
INSERT INTO public.winner_cascade (auction_id, bidder_id, position)
VALUES (v_rec.id, v_winner, 1);
```

### 6.4 `winner_give_consent` (NEW)

```sql
CREATE OR REPLACE FUNCTION public.winner_give_consent(p_auction_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction public.auctions;
  v_user UUID := auth.uid();
  v_buyer_phone TEXT;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_auction
  FROM public.auctions
  WHERE id = p_auction_id AND status = 'awaiting_winner_consent'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_auction.winner_id <> v_user THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_winner');
  END IF;

  -- Get buyer phone
  SELECT phone INTO v_buyer_phone FROM public.profiles WHERE id = v_user;

  -- Update auction
  UPDATE public.auctions
  SET
    status = 'payment_stage',
    winner_consent_given = true,
    winner_contacted_at = now(),
    updated_at = now()
  WHERE id = p_auction_id;

  -- Update winner cascade
  UPDATE public.winner_cascade
  SET consented_at = now()
  WHERE auction_id = p_auction_id AND bidder_id = v_user;

  -- Notify seller with winner contact
  INSERT INTO public.notification_outbox (user_id, type, payload)
  VALUES (
    v_auction.seller_id,
    'winner_consented',
    jsonb_build_object(
      'auction_id', p_auction_id,
      'title', v_auction.title,
      'bid_number', v_auction.bid_number,
      'winning_amount', v_auction.current_highest_bid,
      'winner_phone', v_buyer_phone,
      'position', v_auction.winner_position
    )
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.winner_give_consent(UUID) TO authenticated;
```

### 6.5 `seller_submit_closure` (NEW)

```sql
CREATE OR REPLACE FUNCTION public.seller_submit_closure(
  p_auction_id UUID,
  p_outcome TEXT,
  p_notes TEXT DEFAULT NULL,
  p_select_next BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction public.auctions;
  v_user UUID := auth.uid();
  v_next_winner UUID;
  v_next_amount NUMERIC;
  v_position INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_auction
  FROM public.auctions
  WHERE id = p_auction_id AND status = 'payment_stage'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_auction.seller_id <> v_user THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  -- Insert closure report
  INSERT INTO public.auction_closure_reports
    (auction_id, seller_id, outcome, notes, select_next)
  VALUES
    (p_auction_id, v_user, p_outcome, p_notes, p_select_next);

  -- Update winner cascade
  UPDATE public.winner_cascade
  SET closure_outcome = p_outcome
  WHERE auction_id = p_auction_id AND bidder_id = v_auction.winner_id;

  IF p_outcome = 'completed' THEN
    -- Mark auction completed
    UPDATE public.auctions SET status = 'completed', updated_at = now() WHERE id = p_auction_id;

    -- Notify buyer to leave feedback
    INSERT INTO public.notification_outbox (user_id, type, payload)
    VALUES (
      v_auction.winner_id,
      'please_leave_feedback',
      jsonb_build_object('auction_id', p_auction_id, 'title', v_auction.title)
    );

  ELSIF p_select_next THEN
    -- Find next highest bidder not yet tried
    v_position := v_auction.winner_position + 1;

    SELECT b.bidder_id, b.amount
    INTO v_next_winner, v_next_amount
    FROM public.bids b
    WHERE b.auction_id = p_auction_id
      AND b.bidder_id <> v_auction.winner_id
      AND b.bidder_id NOT IN (
        SELECT bidder_id FROM public.winner_cascade WHERE auction_id = p_auction_id
      )
    ORDER BY b.amount DESC, b.created_at DESC
    LIMIT 1;

    IF v_next_winner IS NULL THEN
      -- No more eligible bidders
      UPDATE public.auctions SET status = 'cancelled', updated_at = now() WHERE id = p_auction_id;
      RETURN jsonb_build_object('ok', true, 'message', 'no_more_bidders');
    END IF;

    -- Set new winner
    UPDATE public.auctions
    SET
      winner_id = v_next_winner,
      current_highest_bid = v_next_amount,
      winner_position = v_position,
      winner_consent_given = false,
      status = 'awaiting_winner_consent',
      updated_at = now()
    WHERE id = p_auction_id;

    -- Track in cascade
    INSERT INTO public.winner_cascade (auction_id, bidder_id, position)
    VALUES (p_auction_id, v_next_winner, v_position);

    -- Notify new winner
    INSERT INTO public.notification_outbox (user_id, type, payload)
    VALUES (
      v_next_winner,
      'winner_consent_requested',
      jsonb_build_object(
        'auction_id', p_auction_id,
        'title', v_auction.title,
        'bid_number', v_auction.bid_number,
        'winning_amount', v_next_amount,
        'communication_code', v_auction.communication_code,
        'seller_phone', v_auction.seller_phone,
        'position', v_position
      )
    );

  ELSE
    -- Cancelled, no next winner
    UPDATE public.auctions SET status = 'cancelled', updated_at = now() WHERE id = p_auction_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.seller_submit_closure(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;
```

### 6.6 `buyer_submit_feedback` (NEW)

```sql
CREATE OR REPLACE FUNCTION public.buyer_submit_feedback(
  p_auction_id UUID,
  p_stars SMALLINT,
  p_feedback_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction public.auctions;
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id;

  IF NOT FOUND OR v_auction.winner_id <> v_user THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  INSERT INTO public.seller_ratings
    (auction_id, buyer_id, seller_id, stars, feedback_type)
  VALUES
    (p_auction_id, v_user, v_auction.seller_id, p_stars, p_feedback_type)
  ON CONFLICT (auction_id, buyer_id) DO UPDATE
    SET stars = EXCLUDED.stars, feedback_type = EXCLUDED.feedback_type;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.buyer_submit_feedback(UUID, SMALLINT, TEXT) TO authenticated;
```

---

## 7. Notification System Expansion

### 7.1 Add `read_at` to `notification_outbox`

```sql
ALTER TABLE public.notification_outbox
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
```

### 7.2 New Notification Types

Update `process-notifications` Edge Function to handle new types:

| Type                          | Subject                                    | Recipient |
| ----------------------------- | ------------------------------------------ | --------- |
| `listing_approved_with_codes` | "Your bid is now LIVE — Bid #{bid_number}" | Seller    |
| `winner_consent_requested`    | "You've won — Bid #{bid_number}"           | Winner    |
| `winner_consented`            | "Winner confirmed — contact them now"      | Seller    |
| `please_leave_feedback`       | "How was your experience?"                 | Buyer     |
| `payment_proof_received`      | "Payment proof received — under review"    | Seller    |

### 7.3 In-app Notification List

**`app/(tabs)/notifications.tsx`** (new tab screen):

```tsx
// Reads from notification_outbox where user_id = current user
// Renders each row as a tappable card
// Marks read_at on tap
// Shows unread count in tab badge
```

Query hook: **`src/data/notifications.ts`** (new file)

```ts
export function useMyNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("notification_outbox")
        .select("id, type, payload, read_at, created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUnreadCount() {
  // Returns count of rows where read_at IS NULL
}
```

---

## 8. File-by-File Change List

### Files to CREATE

```
app/create/_layout.tsx
app/create/step1-details.tsx
app/create/step2-terms.tsx
app/create/step3-payment.tsx
app/(tabs)/notifications.tsx
app/auction/consent/[id].tsx
app/auction/closure/[id].tsx
app/auction/feedback/[id].tsx
app/admin/auction/[id].tsx
src/components/ui/Checkbox.tsx
src/components/ui/StarRating.tsx
src/components/ui/StepIndicator.tsx
src/components/ui/CommunicationCodeCard.tsx
src/components/ui/NotificationCard.tsx
src/data/notifications.ts
src/data/ratings.ts
supabase/migrations/20250523000001_featured_bid_flow.sql
supabase/migrations/20250523000002_payment_proof_storage.sql
supabase/migrations/20250523000003_updated_rpcs.sql
```

### Files to MODIFY

```
app/(tabs)/_layout.tsx
  → Add "Notifications" tab (5th tab replacing or alongside Profile)
  → Import useUnreadCount for badge

app/(tabs)/create.tsx
  → REMOVE (replaced by app/create/ wizard)
  → OR redirect to app/create/step1-details

app/auction/[id].tsx
  → Add winner consent section (when status = awaiting_winner_consent + user is winner)
  → Add seller winner-info section (when status = payment_stage + user is seller)
  → Add communication code card (seller view, any active/live status)
  → Add "Submit Closure Form" button (seller, payment_stage)
  → Add "Give Feedback" button (buyer, completed)
  → Update status label display

app/my-auctions.tsx
  → Show bid_number and communication_code
  → Show correct status labels
  → Show winner phone (post-consent, seller view)
  → Add closure form button

app/admin/pending.tsx
  → Add "FEATURED" badge
  → Add "View Payment Proof" button (image viewer)
  → Add "Verify Payment" button → calls admin_verify_featured_payment
  → Show bid_number and communication_code after approval

app/admin/index.tsx
  → Add "Payment Verifications" quick action
  → Add "Awaiting Closure" quick action

src/data/auctions.ts
  → Add bid_number, communication_code, winner_consent_given, seller_phone to queries
  → Add useAuctionWinnerCascade hook
  → Update status filter labels

src/data/user-auctions.ts
  → Update useMyAuctions to include new fields

supabase/functions/close-expired-auctions/index.ts
  → Status change: won → awaiting_winner_consent

supabase/functions/process-notifications/index.ts
  → Add new notification type handlers
  → Add email templates for all new types

supabase/migrations/20250522120001_rls_and_rpcs.sql
  → admin_approve_auction updated in new migration (override)
  → close_expired_auctions updated in new migration (override)
```

---

## 9. Implementation Order

Execute in this sequence to avoid dependency issues:

### Phase 1 — Database (Day 1)

1. Run `20250523000001_featured_bid_flow.sql` (new tables, columns, sequences)
2. Run `20250523000002_payment_proof_storage.sql` (storage bucket)
3. Run `20250523000003_updated_rpcs.sql` (new + updated RPCs)

### Phase 2 — Core Components (Day 1–2)

4. Create `src/components/ui/Checkbox.tsx`
5. Create `src/components/ui/StarRating.tsx`
6. Create `src/components/ui/StepIndicator.tsx`
7. Create `src/components/ui/CommunicationCodeCard.tsx`
8. Create `src/components/ui/NotificationCard.tsx`

### Phase 3 — Data Hooks (Day 2)

9. Create `src/data/notifications.ts`
10. Create `src/data/ratings.ts`
11. Update `src/data/auctions.ts` with new fields

### Phase 4 — Create Auction Wizard (Day 2–3)

12. Create `app/create/_layout.tsx`
13. Create `app/create/step1-details.tsx` (migrate from `create.tsx`)
14. Create `app/create/step2-terms.tsx`
15. Create `app/create/step3-payment.tsx`
16. Update `app/(tabs)/_layout.tsx` to redirect Create tab to wizard

### Phase 5 — Auction Detail Extensions (Day 3–4)

17. Update `app/auction/[id].tsx` with all new sections
18. Create `app/auction/consent/[id].tsx`
19. Create `app/auction/closure/[id].tsx`
20. Create `app/auction/feedback/[id].tsx`

### Phase 6 — Admin Extensions (Day 4)

21. Update `app/admin/pending.tsx`
22. Create `app/admin/auction/[id].tsx`
23. Update `app/admin/index.tsx`

### Phase 7 — Notifications (Day 4–5)

24. Create `app/(tabs)/notifications.tsx`
25. Update `app/(tabs)/_layout.tsx` with notification tab + badge
26. Update `supabase/functions/process-notifications/index.ts`

### Phase 8 — Close Expiry Flow Update (Day 5)

27. Update `supabase/functions/close-expired-auctions/index.ts`
28. Update `app/my-auctions.tsx`

### Phase 9 — Testing & Polish (Day 5–6)

29. End-to-end test: create featured → pay → approve → bid → close → consent → closure → feedback
30. End-to-end test: next winner cascade (2nd → 3rd)
31. Verify all notification types trigger and display correctly
32. Test admin payment verification flow

---

## Appendix A — Environment Variables Required

Add to `.env` and Supabase secrets:

```env
# Featured listing payment details (shown in UI)
EXPO_PUBLIC_FEATURED_FEE_AMOUNT=150
EXPO_PUBLIC_FEATURED_FEE_ACCOUNT_NUMBER=7730000XXXXX
EXPO_PUBLIC_FEATURED_FEE_ACCOUNT_NAME=Feridhoo Holdings
```

## Appendix B — New Component Specs

### `CommunicationCodeCard`

```tsx
// Displays bid number + code to seller in a styled box
// Props: bidNumber: string, communicationCode: string
// Style: yellow/accent background, monospace font for code
// Warning: "Share ONLY with winning bidder"
```

### `StepIndicator`

```tsx
// Shows step 1/2/3 progress in wizard
// Props: currentStep: number, totalSteps: number, labels: string[]
// Style: filled circles for completed, outline for upcoming
```

### `StarRating`

```tsx
// Interactive 1–5 star selector
// Props: value: number, onChange: (n: number) => void
// Style: large tappable stars, yellow fill for selected
```

### `Checkbox`

```tsx
// Simple checked/unchecked toggle with label
// Props: checked: boolean, onToggle: () => void, label: string
// Accessibility: role="checkbox"
```

---

_Document version: 1.0 | Generated for Cursor AI implementation | ESNeelan / BIDSTREAM platform_
