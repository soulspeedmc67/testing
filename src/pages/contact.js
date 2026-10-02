import React from "react";
import Link from "next/link";
import { Mail, MapPin, MessageSquare } from "lucide-react";
import InfoPage, { InfoSection } from "../components/InfoPage";

/*
 * Contact details for customers and for payment partners checking the business.
 * Email and the in-app help only: DASHIT doesn't offer a "call us" button.
 */
const ADDRESS_LINES = ["DASHIT", "Anantnag, Jammu & Kashmir", "PIN 192101, India"];

function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-[#FF5B00]/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#FF5B00]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-500 dark:text-content-faint">{label}</p>
        <div className="mt-0.5 text-[15px] text-slate-800 dark:text-content">{children}</div>
      </div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <InfoPage
      title="Contact Us"
      seoTitle="Contact DASHIT — Grocery Delivery in Anantnag"
      description="Contact DASHIT, Anantnag's quick grocery delivery service: email, in-app help and address."
      path="/contact"
    >
      <div className="space-y-6">
        <Row icon={Mail} label="Email">
          <a href="mailto:support@dashit.co.in" className="text-[#FF5B00] font-semibold">support@dashit.co.in</a>
        </Row>
        <Row icon={MessageSquare} label="In the app">
          Open <strong>Profile → Help</strong> to ask about an order, a refund or your account.
        </Row>
        <Row icon={MapPin} label="Address">
          {ADDRESS_LINES.map((line) => (
            <span key={line} className="block">{line}</span>
          ))}
        </Row>
      </div>

      <InfoSection title="Complaints">
        <p>
          To raise a formal complaint with our Grievance Officer, see{" "}
          <Link href="/complaints" className="text-[#FF5B00] font-semibold">Complaints</Link>. For cancellations and
          refunds, see our <Link href="/refund-policy" className="text-[#FF5B00] font-semibold">Refund &amp; Cancellation Policy</Link>.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
