import React from "react";
import Link from "next/link";
import InfoPage, { InfoSection } from "../components/InfoPage";

export default function RefundPolicyPage() {
  return (
    <InfoPage
      title="Refunds & Cancellations"
      seoTitle="Refund & Cancellation Policy — DASHIT"
      description="How to cancel a DASHIT order, what we refund, and how long refunds take for UPI, card and net banking payments in Anantnag."
      path="/refund-policy"
      updated="Last updated: October 2026 • DASHIT grocery delivery, Anantnag, Jammu & Kashmir (PIN 192101)"
    >
      <InfoSection title="1. Cancelling an order">
        <p>
          You can cancel an order from the app at any time until it has been handed to a rider. Once the order is
          marked &quot;Out for Delivery&quot; it can no longer be cancelled.
        </p>
        <p>
          If you paid online and cancel before dispatch, the full amount is refunded. Cash on Delivery orders that are
          cancelled have nothing to refund.
        </p>
        <p>
          We may cancel an order ourselves if an address is outside our delivery area, if items are unavailable, or if
          we cannot reach you. If you paid online, the full amount is refunded.
        </p>
      </InfoSection>

      <InfoSection title="2. Missing, damaged or wrong items">
        <p>
          If an item you ordered is out of stock after you have placed the order, we tell you and refund that item.
        </p>
        <p>
          Please check fresh produce, dairy and bakery items when they arrive. If anything is damaged, spoiled or not
          what you ordered, tell us within 2 hours of delivery through Help in the app or at{" "}
          <a href="mailto:support@dashit.co.in" className="text-[#FF5B00] font-semibold">support@dashit.co.in</a>, with
          a photo if you can. We will replace the item or refund it.
        </p>
      </InfoSection>

      <InfoSection title="3. Returns">
        <p>
          Groceries and other everyday items cannot be returned once delivered unless they were damaged, spoiled or
          incorrect, as described above. Opened packs and items reported after 2 hours are not refundable.
        </p>
      </InfoSection>

      <InfoSection title="4. How and when refunds are paid">
        <p>
          Refunds go back to the way you paid: to the same UPI account, card or bank account. We start the refund as
          soon as it is approved, and your bank or UPI app usually shows it within 5 to 7 working days.
        </p>
        <p>
          Online payments are processed securely by Razorpay. DASHIT never sees or stores your card details.
        </p>
      </InfoSection>

      <InfoSection title="5. Questions">
        <p>
          For anything about an order, a cancellation or a refund, see our{" "}
          <Link href="/contact" className="text-[#FF5B00] font-semibold">contact page</Link> or write to{" "}
          <a href="mailto:support@dashit.co.in" className="text-[#FF5B00] font-semibold">support@dashit.co.in</a>. Our
          full terms are on the <Link href="/terms" className="text-[#FF5B00] font-semibold">Terms &amp; Conditions</Link>{" "}
          page.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
