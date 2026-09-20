import { useEffect } from "react";
import { useRouter } from "next/router";
import SEO from "../components/SEO";

export default function OrderAgainRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/orders");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center dark:bg-surface">
      <SEO title="Order Again" noindex={true} />
      <div className="w-6 h-6 border-2 border-[#FF5B00] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
