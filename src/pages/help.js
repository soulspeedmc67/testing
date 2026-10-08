import React, { useState } from "react";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Mail, ChevronDown, ArrowUpRight } from "lucide-react";
import SEO from "../components/SEO";
import { BreadcrumbJsonLd } from "../components/JsonLd";
import { goBack } from "../lib/navigation";
import { useShopRules } from "../lib/useShopRules";

/* Same numbers and addresses as the Terms (section 6) and the site footer. */
const SUPPORT_EMAIL = "support@dashit.co.in";
const WHATSAPP_URL = "https://wa.me/916006990032?text=Hi%20DASHit%2C%20I%20need%20help%20with%20my%20order";

/* Answers follow the app's real rules (8 km area, 30-second change window,
   delivery code) and the Terms. An answer that quotes the shop's fees is a
   function of its current rules (useShopRules), so it never goes stale. */
const QUESTIONS = [
  {
    q: "Where do you deliver?",
    a: "Anywhere within 8 km of our store in Anantnag. Further out you can still order, and the store confirms each of those orders before sending it.",
  },
  {
    q: "How long will my order take?",
    a: "The time shown in the shop is worked out from how far you are from our store. It's an estimate, and it can be longer in heavy traffic, snow or bad weather.",
  },
  {
    q: "Can I change or cancel my order?",
    a: "For 30 seconds after you place it, you can add items or cancel from the order tracker. After that, message us on WhatsApp: an order can still be cancelled until it leaves with the rider.",
  },
  {
    q: "What is the delivery code?",
    a: "Every order has a 4-digit code on its tracker. Share it with your rider at the door; they need it to hand the order over, so it only reaches you.",
  },
  {
    q: "Is there a delivery fee?",
    a: (rules) => {
      const fee = (amount) => (amount > 0 ? `₹${amount}` : "free");
      return [
        rules.freeDeliveryOrders > 0 ? `Delivery is free on your first ${rules.freeDeliveryOrders} orders.` : "",
        `${rules.freeDeliveryOrders > 0 ? "After that it" : "Delivery"} depends on the size of your order: ${fee(rules.deliveryLowFee)} on orders of ₹${rules.deliveryLowFrom} or more, ${fee(rules.deliveryMidFee)} from ₹${rules.deliverySmallBelow}, and ${rules.deliverySmallPercent}% of the items total below that.`,
        rules.handlingFee > 0 ? `Every order also has a ₹${rules.handlingFee} handling charge, which may vary with weather and unforeseen conditions.` : "",
        "After 8 pm delivery can be charged by distance instead; checkout shows the exact fee before you order.",
        rules.minOrderValue > 0 ? `We deliver orders of ₹${rules.minOrderValue} or more.` : "",
      ]
        .filter(Boolean)
        .join(" ");
    },
  },
  {
    q: "Something is missing, damaged or wrong",
    a: "Tell us within 2 hours of delivery on WhatsApp or by email, and we'll replace it or refund it.",
  },
  {
    q: "How do I delete my account?",
    a: "Open Profile and choose Delete account at the bottom. Your profile, saved addresses and personal details are erased.",
  },
];

function WhatsAppGlyph({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.031 2C6.496 2 2 6.5 2 12.04c0 1.975.567 3.82 1.554 5.378L2.25 22l4.757-1.25a10.02 10.02 0 0 0 5.024 1.34h.005c5.534 0 10.03-4.5 10.03-10.04C22.066 6.5 17.565 2 12.031 2zm4.568 12.118c-.25-.125-1.48-.73-1.71-.813-.23-.083-.396-.125-.563.125-.166.25-.646.813-.791.979-.146.167-.292.188-.542.063-.25-.125-1.054-.388-2.008-1.238-.742-.662-1.242-1.48-1.388-1.73-.146-.25-.015-.385.11-.51.112-.112.25-.292.375-.438.125-.146.167-.25.25-.417.083-.167.042-.313-.02-.438-.063-.125-.563-1.354-.771-1.854-.203-.487-.41-.421-.563-.429l-.48-.008c-.166 0-.437.063-.666.313-.23.25-.875.854-.875 2.083 0 1.23.896 2.417 1.02 2.584.126.166 1.764 2.693 4.274 3.777.597.258 1.064.412 1.428.528.6.19 1.146.164 1.577.099.48-.072 1.48-.604 1.688-1.188.208-.583.208-1.083.146-1.188-.063-.104-.23-.166-.48-.291z" />
    </svg>
  );
}

export default function HelpPage() {
  const router = useRouter();
  const [open, setOpen] = useState(null);
  const rules = useShopRules();

  const contacts = [
    {
      href: WHATSAPP_URL,
      title: "Chat on WhatsApp",
      subtitle: "Usually the quickest",
      icon: <WhatsAppGlyph />,
      tint: "bg-[#25D366]",
      external: true,
    },
    {
      href: `mailto:${SUPPORT_EMAIL}?subject=DASHit%20help`,
      title: "Email us",
      subtitle: SUPPORT_EMAIL,
      icon: <Mail className="w-5 h-5" />,
      tint: "bg-[#FF5B00]",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900 font-sans dark:bg-surface dark:text-content">
      <SEO
        title="Help & Support — DASHIT"
        description="Call, WhatsApp or email DASHIT support in Anantnag, and answers to common questions about delivery, orders and your account."
        canonical="/help/"
        ogType="website"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Help & Support", url: "/help/" },
        ]}
      />

      <header className="bg-white px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 flex items-center sticky top-0 z-30 border-b border-slate-100 dark:bg-surface dark:border-line-soft">
        <button
          type="button"
          onClick={() => goBack(router, "/account")}
          aria-label="Back"
          className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-transform cursor-pointer dark:border-line dark:text-content-secondary"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <h1 className="text-base font-extrabold text-slate-900 mx-auto -translate-x-5 dark:text-content">
          Help &amp; support
        </h1>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 pb-16 space-y-5">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-[#061838] p-5 pr-32 min-h-[132px]">
          <h2 className="text-xl font-black text-white tracking-tight">How can we help?</h2>
          <p className="text-xs text-white/75 font-medium mt-1.5 leading-relaxed">
            Our Anantnag team answers messages while the store is open.
          </p>
          <picture>
            <source srcSet="/art/rider-holding-groceries-transparent.webp" type="image/webp" />
            <img
              src="/art/rider-holding-groceries-transparent.png"
              alt=""
              aria-hidden="true"
              width={878}
              height={1327}
              decoding="async"
              className="absolute right-3 -bottom-3 h-[140px] w-auto object-contain pointer-events-none select-none"
            />
          </picture>
        </div>

        {/* Contact */}
        <div className="space-y-2.5">
          {contacts.map((c) => (
            <a
              key={c.title}
              href={c.href}
              target={c.external ? "_blank" : undefined}
              rel={c.external ? "noopener noreferrer" : undefined}
              className="flex items-center gap-3.5 bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs active:scale-[0.98] transition-transform dark:bg-surface-raised dark:border-line/90"
            >
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${c.tint}`}>
                {c.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900 dark:text-content">{c.title}</span>
                <span className="block text-xs text-slate-500 truncate dark:text-content-muted">{c.subtitle}</span>
              </span>
              <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0 dark:text-content-faint" />
            </a>
          ))}
        </div>

        {/* FAQs */}
        <div>
          <h2 className="text-base font-black text-slate-900 px-1 mb-2 dark:text-content">Common questions</h2>
          <div className="bg-white border border-slate-200/90 rounded-3xl divide-y divide-slate-100 shadow-xs overflow-hidden dark:bg-surface-raised dark:border-line/90 dark:divide-line-soft">
            {QUESTIONS.map((item, i) => {
              const isOpen = open === i;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-start justify-between gap-3 p-4 text-left cursor-pointer"
                  >
                    <span className="text-sm font-bold text-slate-800 dark:text-content">{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 mt-0.5 shrink-0 text-slate-400 transition-transform dark:text-content-faint ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.p
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-4 text-[13px] leading-relaxed text-slate-600 overflow-hidden dark:text-content-secondary"
                      >
                        <span className="block pb-4">{typeof item.a === "function" ? item.a(rules) : item.a}</span>
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-center gap-5 pt-1 text-xs font-bold text-slate-500 dark:text-content-muted">
          <button type="button" onClick={() => router.push("/privacy")} className="hover:text-[#FF5B00] cursor-pointer">
            Privacy Policy
          </button>
          <button type="button" onClick={() => router.push("/terms")} className="hover:text-[#FF5B00] cursor-pointer">
            Terms &amp; Conditions
          </button>
          <button type="button" onClick={() => router.push("/complaints")} className="hover:text-[#FF5B00] cursor-pointer">
            Complaints
          </button>
        </div>
      </main>
    </div>
  );
}
