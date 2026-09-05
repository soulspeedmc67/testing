import { useEffect } from "react";
import { useRouter } from "next/router";

export default function OrderAgainRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/orders");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#FF5B00] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
