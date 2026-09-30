import React, { useDeferredValue, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  Plus,
  ArrowRight,
  Layers,
  Image as ImageIcon,
  Tag,
  Boxes,
  IndianRupee,
  Barcode
} from "lucide-react";
import ProductImage from "../ProductImage";
import { Truck } from "lucide-react";
import { catalogPhotoUrl, loadCatalog, searchCatalog } from "../../lib/productCatalog";
import { findPhotoFor } from "../../lib/productPhotoFinder";
import { isPlaceholderImage } from "../../lib/productPhotoMatch";

export default function AddProductView({
  productForm,
  setProductForm,
  photoSuggestions = [],
  onOpenScanner,
  onPublishProduct,
  isPublishing = false,
  quickTemplates = [],
  categories = [],
  distributors = [],
  onQuickAddDistributor,
  darkMode = false,
}) {
  const [showNewDistributorInput, setShowNewDistributorInput] = useState(false);
  const [newDistributorName, setNewDistributorName] = useState("");

  /* Names from the product list (lib/productCatalog). The list downloads the
     first time the name box is focused; until then, or if it can't load, the
     box is a plain text box. */
  const [catalog, setCatalog] = useState(null);
  const [isNameOpen, setIsNameOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const typedName = useDeferredValue(productForm.name);
  const suggestions = useMemo(
    () => (isNameOpen && catalog ? searchCatalog(catalog, typedName, 6) : []),
    [catalog, typedName, isNameOpen]
  );
  const showSuggestions = suggestions.length > 0;

  const openCatalog = () => {
    if (!catalog) loadCatalog().then(setCatalog).catch(() => {});
  };

  // A photo for a picked name, from Open Food Facts; offered, never put in by itself.
  const [namePhoto, setNamePhoto] = useState({ status: "idle", img: "", offBarcode: "" });
  const photoLookup = useRef(0);
  const forgetNamePhoto = () => {
    photoLookup.current += 1;
    setNamePhoto({ status: "idle", img: "", offBarcode: "" });
  };

  const pickSuggestion = async (item) => {
    setIsNameOpen(false);
    setActiveIndex(-1);
    const catalogImg = catalogPhotoUrl(item.img);
    setProductForm((p) => ({
      ...p,
      name: item.name,
      cat: categories.includes(item.shelf) ? item.shelf : p.cat,
      brand: item.brand || p.brand,
      unit: item.unit || p.unit,
      img: catalogImg || (isPlaceholderImage(p.img) ? "" : p.img),
      imgSource: catalogImg ? "catalog" : p.imgSource,
    }));
    forgetNamePhoto();

    // If catalog already provided the authentic self-hosted photo, no need for external lookup
    if (catalogImg) {
      setNamePhoto({ status: "found", img: catalogImg, offBarcode: "" });
      return;
    }

    // A photo already chosen or scanned stays; only an empty form gets one looked up.
    if (!isPlaceholderImage(productForm.img)) return;
    const lookup = photoLookup.current;
    setNamePhoto({ status: "looking", img: "", offBarcode: "" });
    let found = null;
    try {
      found = await findPhotoFor({ name: item.name, brand: item.brand, unit: item.unit });
    } catch {
      found = null;
    }
    if (lookup !== photoLookup.current) return;
    setNamePhoto(
      found?.status === "found"
        ? { status: "found", img: found.img, offBarcode: found.offBarcode || "" }
        : { status: "missing", img: "", offBarcode: "" }
    );
  };

  const handleNameKeyDown = (e) => {
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault();
      setIsNameOpen(true);
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && showSuggestions && activeIndex >= 0) {
      // Picks the highlighted name instead of sending the form.
      e.preventDefault();
      pickSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape" && showSuggestions) {
      setIsNameOpen(false);
      setActiveIndex(-1);
    }
  };

  /* One definition for every box on this form: the styling used to be pasted
     onto each input, which is how they drifted apart in the first place. */
  const labelCls =
    "text-[11px] font-bold uppercase text-slate-600 dark:text-zinc-300 block mb-1";
  const fieldCls = `w-full text-xs font-bold px-3 py-2.5 rounded-xl border outline-none transition-all ${
    darkMode
      ? "bg-[#1A1D26] border-zinc-700 text-white placeholder:text-zinc-500 focus:border-[#FF5B00]"
      : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#FF5B00]"
  }`;

  const handleCategoryChange = (newCat) => {
    setProductForm((prev) => ({ ...prev, cat: newCat }));
  };

  const handleApplyTemplate = (tpl) => {
    setProductForm((prev) => ({
      ...prev,
      name: tpl.name,
      cat: tpl.cat,
      price: tpl.price,
      originalPrice: tpl.originalPrice,
      unit: tpl.unit,
      brand: tpl.brand,
      badge: tpl.badge,
      // Templates carry no photo: keep one already chosen.
      img: tpl.img || prev.img,
      stock: tpl.stock,
    }));
  };

  return (
    <div className="space-y-5">
      {/* 1. Barcode & 4K Camera Banner */}
      <div
        className={`rounded-2xl p-5 border flex items-center justify-between flex-wrap gap-4 transition-colors ${
          darkMode
            ? "bg-[#14161E] border-zinc-800"
            : "bg-slate-50 border-slate-200 shadow-xs"
        }`}
      >
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-[#FF5B00]" />
            <h2 className="font-black text-base text-slate-900 dark:text-white">
              Scan the barcode — we fill the rest
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-400">
            Point the camera at the barcode on the pack. The name, brand and a photo are filled in for you — you only add the price and how many you have.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenScanner}
          className="flex items-center space-x-2 bg-[#FF5B00] hover:bg-[#E04E00] text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-md transition-all cursor-pointer active:scale-95"
        >
          <Camera className="w-4 h-4" />
          <span>Scan with Camera</span>
        </button>
      </div>

      {/* 2. The photo found for the scanned barcode (Open Food Facts) */}
      {photoSuggestions.length > 0 && (
        <div
          className={`rounded-2xl p-4 sm:p-5 border space-y-3 transition-colors ${
            darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center space-x-2">
            <ImageIcon className="w-4 h-4 text-[#FF5B00]" />
            <h3 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">Photo found for this barcode</h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {photoSuggestions.map((url, idx) => {
              const isSelected = productForm.img === url;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setProductForm((prev) => ({ ...prev, img: url, imgSource: "openfoodfacts" }))}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    isSelected ? "border-[#FF5B00] ring-2 ring-[#FF5B00]/30" : "border-slate-200 dark:border-zinc-700 hover:border-slate-400"
                  }`}
                >
                  <ProductImage src={url} name={productForm.name || "Product"} />
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#FF5B00] text-white flex items-center justify-center shadow-md">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Quick Local FMCG Templates */}
      <div
        className={`rounded-2xl p-4 border space-y-2.5 transition-colors ${
          darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Quick 1-Click Templates (Anantnag Essentials)
          </span>
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold">Tap to auto-fill</span>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none py-1">
          {quickTemplates.map((tpl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyTemplate(tpl)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center space-x-2 ${
                darkMode
                  ? "bg-[#1A1D26] hover:bg-zinc-800 border-zinc-700 text-zinc-200"
                  : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
              }`}
            >
              <img src={tpl.img} alt={tpl.name} className="w-4 h-4 rounded-full object-cover" />
              <span>{tpl.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Product Details Form & Live Card Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form Fields (2 columns) */}
        <form
          onSubmit={onPublishProduct}
          className={`lg:col-span-2 rounded-2xl p-5 border space-y-4 transition-colors ${
            darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between border-b pb-3 border-slate-200/50 dark:border-zinc-800">
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              Product Information
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-bold">Only the starred boxes are needed</span>
          </div>

          {/* Item name, with names from the product list as you type */}
          <div className="relative">
            <label htmlFor="add-name" className={labelCls}>
              Item name *
            </label>
            <input
              id="add-name"
              type="text"
              required
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showSuggestions}
              aria-controls="add-name-list"
              aria-activedescendant={showSuggestions && activeIndex >= 0 ? `add-name-opt-${activeIndex}` : undefined}
              value={productForm.name}
              onFocus={() => {
                openCatalog();
                setIsNameOpen(true);
              }}
              onBlur={() => setIsNameOpen(false)}
              onChange={(e) => {
                setProductForm((p) => ({ ...p, name: e.target.value }));
                setIsNameOpen(true);
                setActiveIndex(-1);
                forgetNamePhoto();
              }}
              onKeyDown={handleNameKeyDown}
              placeholder="Amul Taaza Toned Milk"
              className={fieldCls}
            />

            {showSuggestions && (
              <ul
                id="add-name-list"
                role="listbox"
                aria-label="Names from the product list"
                // Keeps focus in the box so a tap picks the name instead of closing the list.
                onMouseDown={(e) => e.preventDefault()}
                className={`absolute left-0 right-0 top-full mt-1 z-30 max-h-72 overflow-y-auto rounded-xl border py-1 shadow-lg ${
                  darkMode ? "bg-[#1A1D26] border-zinc-700" : "bg-white border-slate-200"
                }`}
              >
                {suggestions.map((item, idx) => (
                  <li
                    key={item.index}
                    id={`add-name-opt-${idx}`}
                    role="option"
                    aria-selected={idx === activeIndex}
                    onClick={() => pickSuggestion(item)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer ${
                      idx === activeIndex ? (darkMode ? "bg-zinc-800" : "bg-slate-100") : ""
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200/50 dark:border-zinc-700/50 overflow-hidden shrink-0 flex items-center justify-center">
                      <ProductImage src={item.img} name={item.name} size="small" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">{item.name}</span>
                      <span className="block text-[10.5px] text-slate-500 dark:text-zinc-400 truncate">
                        {item.shelf} · {item.aisle}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {namePhoto.status === "looking" && (
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">Looking for a photo of this item…</p>
            )}
            {namePhoto.status === "missing" && (
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">
                No photo found for this name. Scan the barcode, or paste a photo link below.
              </p>
            )}
            {namePhoto.status === "found" && (
              <div
                className={`mt-2 flex items-center gap-3 rounded-xl border p-2 ${
                  darkMode ? "border-zinc-700" : "border-slate-200"
                }`}
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-700 shrink-0">
                  <ProductImage src={namePhoto.img} name={productForm.name} />
                </div>
                <p className="flex-1 min-w-0 text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                  Photo found on Open Food Facts
                </p>
                {productForm.img === namePhoto.img ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-zinc-400 shrink-0">
                    <Check className="w-3.5 h-3.5" /> In use
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setProductForm((p) => ({ ...p, img: namePhoto.img, imgSource: "openfoodfacts", offBarcode: namePhoto.offBarcode }))
                    }
                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold shrink-0 cursor-pointer ${
                      darkMode
                        ? "border-zinc-600 text-zinc-100 hover:bg-zinc-800"
                        : "border-slate-300 text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    Use this photo
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Only the boxes needed to sell something stay in the open: shelf,
              size, price, count. Everything else is prefilled or cosmetic and
              sits under the disclosure below, so manual entry is five taps and
              a name rather than a ten-field form. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="add-cat" className={labelCls}>
                Which shelf? *
              </label>
              <select
                id="add-cat"
                value={productForm.cat}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className={`${fieldCls} cursor-pointer`}
              >
                {categories
                  .filter((c) => c !== "All")
                  .map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label htmlFor="add-unit" className={labelCls}>
                Size on the pack
              </label>
              <input
                id="add-unit"
                type="text"
                value={productForm.unit}
                onChange={(e) => setProductForm((p) => ({ ...p, unit: e.target.value }))}
                placeholder="1 kg, 500 ml, 6 pcs"
                className={fieldCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="add-price" className={labelCls}>
                Price you charge (₹) *
              </label>
              <input
                id="add-price"
                type="number"
                required
                min="1"
                inputMode="decimal"
                value={productForm.price}
                onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="40"
                className={fieldCls}
              />
            </div>

            <div>
              <label htmlFor="add-stock" className={labelCls}>
                How many do you have? *
              </label>
              <input
                id="add-stock"
                type="number"
                required
                min="0"
                inputMode="numeric"
                value={productForm.stock}
                onChange={(e) => setProductForm((p) => ({ ...p, stock: e.target.value }))}
                placeholder="100"
                className={fieldCls}
              />
            </div>
          </div>

          {/* The listing rule: nothing goes on the app without a photo. */}
          <div>
            <label htmlFor="add-img" className={labelCls}>
              Photo link *
            </label>
            <input
              id="add-img"
              type="url"
              required
              value={productForm.img}
              onChange={(e) => setProductForm((p) => ({ ...p, img: e.target.value, imgSource: "manual" }))}
              placeholder="Paste a photo link, or scan the barcode to find one"
              className={`${fieldCls} font-mono`}
            />
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">
              Every item on the app needs a photo of the pack.
            </p>
          </div>

          {/* Who the item came from */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#14161E]/50">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="add-distributor" className="text-[11px] font-black uppercase text-slate-700 dark:text-zinc-200 flex items-center space-x-1.5">
                <Truck className="w-3.5 h-3.5 text-[#FF5B00]" />
                <span>Distributor</span>
              </label>
              <button
                type="button"
                onClick={() => setShowNewDistributorInput(!showNewDistributorInput)}
                className="text-[10.5px] font-black text-[#FF5B00] hover:underline cursor-pointer"
              >
                {showNewDistributorInput ? "Pick from list" : "+ New distributor"}
              </button>
            </div>

            {showNewDistributorInput ? (
              <div className="flex items-center space-x-2 mt-1">
                <input
                  type="text"
                  value={newDistributorName}
                  onChange={(e) => setNewDistributorName(e.target.value)}
                  placeholder="Distributor name"
                  className={fieldCls}
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = newDistributorName.trim();
                    if (trimmed) {
                      if (onQuickAddDistributor) onQuickAddDistributor(trimmed);
                      setProductForm((p) => ({ ...p, distributor: trimmed }));
                      setShowNewDistributorInput(false);
                      setNewDistributorName("");
                    }
                  }}
                  className="bg-[#FF5B00] hover:bg-[#E04E00] text-white px-3.5 py-2.5 rounded-xl text-xs font-black shrink-0 shadow-xs cursor-pointer active:scale-95"
                >
                  Add
                </button>
              </div>
            ) : (
              <select
                id="add-distributor"
                value={productForm.distributor || ""}
                onChange={(e) => setProductForm((p) => ({ ...p, distributor: e.target.value }))}
                className={`${fieldCls} cursor-pointer`}
              >
                <option value="">Myself</option>
                {distributors
                  .filter((d) => !d.isSelf)
                  .map((d) => (
                    <option key={d.id || d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
              </select>
            )}
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">
              Who you got this item from.
            </p>
          </div>

          {/* A plain <details>: no extra state, opens with the keyboard. */}
          <details className="group">
            <summary className="cursor-pointer list-none py-2.5 select-none text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              <span className="group-open:hidden">+ Add more details (not needed)</span>
              <span className="hidden group-open:inline">− Hide extra details</span>
            </summary>

            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="add-brand" className={labelCls}>
                    Brand
                  </label>
                  <input
                    id="add-brand"
                    type="text"
                    value={productForm.brand}
                    onChange={(e) => setProductForm((p) => ({ ...p, brand: e.target.value }))}
                    placeholder="Amul, Local Kandur"
                    className={fieldCls}
                  />
                </div>

                <div>
                  <label htmlFor="add-mrp" className={labelCls}>
                    Printed MRP (₹)
                  </label>
                  <input
                    id="add-mrp"
                    type="number"
                    min="1"
                    inputMode="decimal"
                    value={productForm.originalPrice}
                    onChange={(e) => setProductForm((p) => ({ ...p, originalPrice: e.target.value }))}
                    placeholder="Shown crossed out"
                    className={fieldCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="add-badge" className={labelCls}>
                    Tag on the card
                  </label>
                  <input
                    id="add-badge"
                    type="text"
                    value={productForm.badge}
                    onChange={(e) => setProductForm((p) => ({ ...p, badge: e.target.value }))}
                    placeholder="Fresh, Bestseller"
                    className={fieldCls}
                  />
                </div>

                <div>
                  <label htmlFor="add-barcode" className={labelCls}>
                    Barcode number
                  </label>
                  <input
                    id="add-barcode"
                    type="text"
                    inputMode="numeric"
                    value={productForm.barcode}
                    onChange={(e) => setProductForm((p) => ({ ...p, barcode: e.target.value }))}
                    placeholder="8901..."
                    className={`${fieldCls} font-mono`}
                  />
                </div>
              </div>

            </div>
          </details>

          {/* Submit Button */}
          <div className="pt-2 border-t border-slate-200/50 flex justify-end">
            <button
              type="submit"
              disabled={isPublishing}
              className="bg-[#FF5B00] hover:bg-[#E04E00] text-white font-black text-xs px-6 py-3 rounded-xl shadow-md transition-all cursor-pointer active:scale-95 flex items-center space-x-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{isPublishing ? "Saving..." : "Put this item in the shop"}</span>
            </button>
          </div>
        </form>

        {/* Live Customer Storefront Preview Card (1 column) */}
        <div className="space-y-3">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
            Customer App Preview
          </span>

          <div
            className={`rounded-2xl border p-4 max-w-xs mx-auto shadow-sm space-y-3 ${
              darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200"
            }`}
          >
            <div className="aspect-square rounded-xl overflow-hidden border border-slate-200/50 dark:border-zinc-750 relative">
              <ProductImage src={productForm.img} name={productForm.name || "New item"} fill letterClassName="text-5xl" />
              {productForm.badge && (
                <span className="absolute top-2 left-2 bg-[#FF5B00] text-white text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md shadow-xs">
                  {productForm.badge}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider block">
                {productForm.brand || "Indian Brand"} · {productForm.unit || "1 pc"}
              </span>
              <h4 className="font-black text-sm text-slate-900 dark:text-white line-clamp-2">
                {productForm.name || "Product Name Preview"}
              </h4>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-base font-black text-slate-900 dark:text-white">
                  ₹{productForm.price || 40}
                </span>
                {productForm.originalPrice && Number(productForm.originalPrice) > Number(productForm.price) && (
                  <span className="text-xs text-slate-400 dark:text-zinc-500 line-through ml-1.5 font-medium">
                    ₹{productForm.originalPrice}
                  </span>
                )}
              </div>

              <div className="px-3 py-1 rounded-lg bg-[#FF5B00] text-white text-xs font-black">
                ADD
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
