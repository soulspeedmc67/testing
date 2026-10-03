import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import SEO from "../components/SEO";
import CheckoutLoginModal from "../components/CheckoutLoginModal";
import { finishRedirectSignIn, readShopper } from "../lib/shopperAuth";

/**
 * Sign in to the web shop: Google, then the mobile number (the same steps as
 * at checkout). Goes back to ?next= (or the shop) when done.
 */
export default function LoginPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [resumeUser, setResumeUser] = useState(null);
  const [error, setError] = useState("");

  const next = typeof router.query.next === "string" && router.query.next.startsWith("/") ? router.query.next : "/shop";

  useEffect(() => {
    if (!router.isReady) return;
    if (readShopper()?.mobile) {
      router.replace(next);
      return;
    }
    let alive = true;
    finishRedirectSignIn().then((res) => {
      if (!alive) return;
      if (res?.user) setResumeUser(res.user);
      if (res?.error) setError(res.error);
      setOpen(true);
    });
    return () => {
      alive = false;
    };
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#FCFBF8] dark:bg-surface flex flex-col">
      <SEO title="Sign in" noindex={true} />
      <div className="max-w-md w-full mx-auto px-5 pt-16 pb-10 grow">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-[#061838] flex items-center justify-center p-1.5">
            <img src="/dashit-mark-white.png" alt="" className="w-full h-full object-contain" />
          </span>
          <span className="font-display text-[21px] font-extrabold tracking-tight text-[#061838] dark:text-white">
            DASH<span className="text-[#FF5B00]">IT</span>
          </span>
        </Link>
        <h1 className="mt-10 font-display text-[30px] font-extrabold tracking-tight leading-tight text-[#061838] dark:text-content">
          Sign in to DASHIT
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600 dark:text-content-muted">
          Use your Google account, then add the mobile number our rider can call.
        </p>
        {error && <p role="alert" className="mt-4 text-[14px] text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-8 w-full h-12 rounded-xl bg-[#061838] text-white text-[15px] font-bold hover:bg-[#0A2449] transition-colors dark:bg-[#FF5B00] dark:hover:bg-[#E04E00]"
        >
          Continue
        </button>
        <Link href="/shop" className="mt-3 block text-center text-[14px] font-semibold text-slate-600 hover:text-slate-900 dark:text-content-muted py-2">
          Keep browsing
        </Link>
      </div>
      <CheckoutLoginModal
        isOpen={open}
        resumeUser={resumeUser}
        onClose={() => setOpen(false)}
        onAuthenticated={() => {
          setOpen(false);
          router.replace(next);
        }}
      />
    </div>
  );
}
