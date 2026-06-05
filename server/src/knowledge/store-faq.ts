/**
 * The fictional store's domain knowledge, versioned in source control and
 * injected into the system prompt. Hardcoding is intentional (and allowed by
 * the brief): it's simple, reviewable, and keeps answers grounded.
 *
 * Future alternative (see README): move this to the DB and retrieve relevant
 * chunks via RAG instead of injecting the whole block.
 */
export const STORE_FAQ = `Store name: Aurora Goods
What we sell: Home goods, kitchenware, candles, stationery, and small gifts.

SHIPPING
- We ship within the USA, Canada, UK, EU, India, and Australia.
- Standard shipping: 3–5 business days (USA), 7–12 business days (international).
- Free standard shipping on orders over $50 (USA) / $80 (international).
- Express shipping (1–2 business days, USA only) available at checkout for $12.
- Orders placed before 2pm ET ship the same business day.

RETURNS & REFUNDS
- 30-day return window from the delivery date.
- Items must be unused and in original packaging.
- Refunds are issued to the original payment method within 5–7 business days of us
  receiving the return.
- Return shipping is free for damaged or incorrect items; otherwise a $5 return
  label fee applies.
- Final-sale items (clearance, personalized goods) are not returnable.

SUPPORT
- Support hours: Monday–Friday, 9am–6pm ET. Closed weekends and US public holidays.
- Email: support@auroragoods.example
- Typical email response time: within 1 business day.

PAYMENTS
- We accept Visa, Mastercard, Amex, Apple Pay, Google Pay, and PayPal.
- Prices are in USD.

ORDERS
- Order changes/cancellations are possible within 1 hour of placing the order.
- A tracking link is emailed once an order ships.`;
