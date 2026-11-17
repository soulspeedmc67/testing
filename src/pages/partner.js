import React, { useCallback, useEffect, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { LogOut, ShieldAlert, UserX } from "lucide-react";
import { watchAuth, getStaffRole, signOut } from "../lib/auth";
import {
  getPartnerAccess, partnerSignIn, watchMyPartner, watchMySettings, watchMyProducts,
  saveMyProduct, setMyStock, deleteMyProduct, saveMySettings, changeMyPassword,
} from "../lib/partners";
import PartnerLogin from "../components/partner/PartnerLogin";
import PartnerShell from "../components/partner/PartnerShell";
import OverviewSection from "../components/partner/OverviewSection";
import StockSection from "../components/partner/StockSection";
import { ShopSection, AccountSection } from "../components/partner/ShopAccountSections";
import { Button, Card, EmptyState, Spinner } from "../components/partner/ui";
import { ShoppingBag } from "lucide-react";

/**
 * The partner portal: where another shop owner running on DASHit signs in with
 * the details DASHit gave him and manages his own stock. He is not staff, so
 * nothing here reads the shop's products, orders or customers (firestore.rules,
 * "Partners"); every call below is under partners/{his id}.
 */

function Notice({ icon: Icon, title, text, onSignOut }) {
  return (
    <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center px-5 font-sans">
      <Card className="max-w-md w-full">
        <EmptyState
          icon={Icon}
          title={title}
          text={text}
          action={<Button variant="navy" onClick={onSignOut}><LogOut className="w-4 h-4" />Sign out</Button>}
        />
      </Card>
    </div>
  );
}

export default function PartnerPage() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const [phase, setPhase] = useState("loading"); // loading | signin | notpartner | suspended | ready
  const [user, setUser] = useState(null);
  const [partnerId, setPartnerId] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  const [partner, setPartner] = useState(null);
  const [settings, setSettings] = useState({});
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);

  const [section, setSection] = useState("overview");
  const [nav, setNav] = useState({});
  const [toast, setToast] = useState("");

  const say = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }, []);

  // Who is signed in, and what are they?
  useEffect(() => {
    let alive = true;
    const unsub = watchAuth(async (u) => {
      if (!alive) return;
      if (!u || u.isAnonymous) {
        setUser(null);
        setPartnerId("");
        setPhase("signin");
        return;
      }
      setUser(u);
      setPhase("loading");
      // The shop's own admins belong in the console, not here.
      const role = await getStaffRole(u.uid);
      if (!alive) return;
      if (role === "admin") {
        routerRef.current.replace("/xcyop");
        return;
      }
      const access = await getPartnerAccess(u.uid);
      if (!alive) return;
      if (!access) return setPhase("notpartner");
      setPartnerId(access.partnerId);
      setPhase(access.suspended ? "suspended" : "ready");
    });
    return () => {
      alive = false;
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // His own data, live.
  useEffect(() => {
    if (phase !== "ready" || !partnerId) return undefined;
    setProductsLoading(true);
    setProductsError(false);
    const offPartner = watchMyPartner(partnerId, (p) => {
      if (!p) return setPhase("suspended"); // switched off mid-session: the rules stop reading it
      setPartner(p);
    });
    const offSettings = watchMySettings(partnerId, setSettings);
    const offProducts = watchMyProducts(
      partnerId,
      (list) => { setProducts(list); setProductsLoading(false); },
      () => { setProductsError(true); setProductsLoading(false); }
    );
    return () => { offPartner(); offSettings(); offProducts(); };
  }, [phase, partnerId]);

  const doLogin = async (email, password) => {
    setLoginBusy(true);
    setLoginError("");
    const r = await partnerSignIn(email, password);
    if (!r.ok) setLoginError(r.message);
    setLoginBusy(false);
  };

  const doSignOut = async () => {
    await signOut();
    setPartner(null); setProducts([]); setSettings({}); setSection("overview");
  };

  const go = (id, opts = {}) => { setNav({ ...opts, at: Date.now() }); setSection(id); window.scrollTo?.({ top: 0 }); };

  const saveProduct = async (id, data) => { await saveMyProduct(partnerId, id, data); say(id ? "Item saved" : "Item added"); };
  const setStock = async (p, n) => {
    try { await setMyStock(partnerId, p.id, n); } catch (e) { say("Couldn't update that count. Try again."); }
  };
  const removeProduct = async (p) => { await deleteMyProduct(partnerId, p.id); say("Item removed"); };
  const saveSettings = async (fields) => { await saveMySettings(partnerId, fields); };

  const head = (
    <Head>
      <title>DASHit Partner</title>
      <meta name="robots" content="noindex,nofollow" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <meta name="theme-color" content="#061838" />
    </Head>
  );

  if (phase === "loading") {
    return <>{head}<div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center"><Spinner label="Opening your dashboard" /></div></>;
  }
  if (phase === "signin") {
    return <>{head}<PartnerLogin onSubmit={doLogin} error={loginError} busy={loginBusy} /></>;
  }
  if (phase === "notpartner") {
    return <>{head}<Notice icon={UserX} title="This isn't a partner account" text="You're signed in, but this account isn't set up as a DASHit partner. Sign out and use the email and password DASHit gave you." onSignOut={doSignOut} /></>;
  }
  if (phase === "suspended") {
    return <>{head}<Notice icon={ShieldAlert} title="Your account is switched off" text="Your partner account isn't active right now. Please contact DASHit to have it switched back on." onSignOut={doSignOut} /></>;
  }

  return (
    <>
      {head}
      <PartnerShell partner={partner} settings={settings} section={section} onSection={(id) => go(id)} onSignOut={doSignOut}>
        {section === "overview" && (
          <OverviewSection partner={partner} settings={settings} products={products} loading={productsLoading} error={productsError} onGo={go} onRestock={setStock} />
        )}
        {section === "stock" && (
          <StockSection products={products} loading={productsLoading} error={productsError} initial={nav} onSave={saveProduct} onSetStock={setStock} onDelete={removeProduct} />
        )}
        {section === "orders" && (
          <div className="space-y-6">
            <h1 className="text-[22px] sm:text-2xl font-extrabold tracking-tight text-[#061838]">Orders</h1>
            <Card>
              <EmptyState icon={ShoppingBag} title="Orders are coming soon" text="When ordering opens for your shop, customers in your delivery area will order from your stock and their orders will appear here. DASHit will let you know." />
            </Card>
          </div>
        )}
        {section === "shop" && <ShopSection partner={partner} settings={settings} onSave={saveSettings} />}
        {section === "account" && <AccountSection email={user?.email || ""} partnerName={partner?.name} onChangePassword={changeMyPassword} onSignOut={doSignOut} />}
      </PartnerShell>
      {toast && (
        <div role="status" className="fixed z-[300] left-1/2 -translate-x-1/2 bottom-24 lg:bottom-8 rounded-full bg-[#061838] text-white text-sm font-bold px-5 py-3 shadow-xl">
          {toast}
        </div>
      )}
    </>
  );
}
