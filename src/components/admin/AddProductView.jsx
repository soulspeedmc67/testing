import React, { useState } from "react";
import {
  Camera,
  Sparkles,
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
import { get4KPhotoSuggestions } from "../../lib/barcodeCatalog";

export default function AddProductView({
  productForm,
  setProductForm,
  photoSuggestions = [],
  setPhotoSuggestions,
  onOpenScanner,
  onPublishProduct,
  isPublishing = false,
  quickTemplates = [],
  categories = [],
  visualPalette = [],
  darkMode = false,
}) {
  const handleCategoryChange = (newCat) => {
    setProductForm((prev) => ({ ...prev, cat: newCat }));
    const newSuggestions = get4KPhotoSuggestions(newCat);
    setPhotoSuggestions(newSuggestions);
    if (newSuggestions && newSuggestions.length > 0) {
      setProductForm((prev) => ({ ...prev, img: newSuggestions[0] }));
    }
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
      img: tpl.img,
      stock: tpl.stock,
    }));
    const newSuggestions = get4KPhotoSuggestions(tpl.cat);
    setPhotoSuggestions(newSuggestions);
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
              Scan Barcode & Auto-Populate Product
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-400">
            Aim camera at any Indian retail packaging barcode. DASHit will automatically lookup verified title, brand, and clean studio 4K photos.
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

      {/* 2. 4K Studio Image Palette (1-Tap Selection) */}
      <div
        className={`rounded-2xl p-4 sm:p-5 border space-y-3 transition-colors ${
          darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wide">
              Clean 4K Studio Photos (1-Tap Selection)
            </h3>
          </div>
          <span className="text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-500 px-2.5 py-0.5 rounded-full">
            Ultra-HD 4K Ready
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          {photoSuggestions.map((url, idx) => {
            const isSelected = productForm.img === url;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setProductForm((prev) => ({ ...prev, img: url }))}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                  isSelected
                    ? "border-[#FF5B00] ring-2 ring-[#FF5B00]/30 scale-105"
                    : "border-slate-200 dark:border-zinc-700 hover:border-slate-400 opacity-80 hover:opacity-100"
                }`}
              >
                <img
                  src={url}
                  alt={`4K option ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
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
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-bold">* Mandatory fields</span>
          </div>

          {/* Product Title */}
          <div>
            <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-zinc-300 block mb-1">
              Product Title *
            </label>
            <input
              type="text"
              required
              value={productForm.name}
              onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Amul Taaza Fresh Toned Milk 1L"
              className={`w-full text-xs font-bold px-3 py-2.5 rounded-xl border outline-none transition-all ${
                darkMode
                  ? "bg-[#1A1D26] border-zinc-700 text-white placeholder:text-zinc-500 focus:border-[#FF5B00]"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF5B00]"
              }`}
            />
          </div>

          {/* Category & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-zinc-300 block mb-1">
                Category *
              </label>
              <select
                value={productForm.cat}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className={`w-full text-xs font-bold px-3 py-2.5 rounded-xl border outline-none cursor-pointer ${
                  darkMode
                    ? "bg-[#1A1D26] border-zinc-700 text-white"
                    : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
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
              <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-zinc-300 block mb-1">
                Brand Name
              </label>
              <input
                type="text"
                value={productForm.brand}
                onChange={(e) => setProductForm((p) => ({ ...p, brand: e.target.value }))}
                placeholder="e.g. Amul / Local Kandur"
                className={`w-full text-xs font-bold px-3 py-2.5 rounded-xl border outline-none ${
                  darkMode
                    ? "bg-[#1A1D26] border-zinc-700 text-white placeholder:text-zinc-500"
                    : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              />
            </div>
          </div>

          {/* Pricing: Price & MRP */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-zinc-300 block mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={productForm.price}
                onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="40"
                className={`w-full text-xs font-bold px-3 py-2.5 rounded-xl border outline-none ${
                  darkMode
                    ? "bg-[#1A1D26] border-zinc-700 text-white placeholder:text-zinc-500"
                    : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-zinc-300 block mb-1">
                MRP / Strikethrough (₹)
              </label>
              <input
                type="number"
                min="1"
                value={productForm.originalPrice}
                onChange={(e) => setProductForm((p) => ({ ...p, originalPrice: e.target.value }))}
                placeholder="45"
                className={`w-full text-xs font-bold px-3 py-2.5 rounded-xl border outline-none ${
                  darkMode
                    ? "bg-[#1A1D26] border-zinc-700 text-white placeholder:text-zinc-500"
                    : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-zinc-300 block mb-1">
                Unit / Pack Size
              </label>
              <input
                type="text"
                value={productForm.unit}
                onChange={(e) => setProductForm((p) => ({ ...p, unit: e.target.value }))}
                placeholder="e.g. 500 ml / 1 kg"
                className={`w-full text-xs font-bold px-3 py-2.5 rounded-xl border outline-none ${
                  darkMode
                    ? "bg-[#1A1D26] border-zinc-700 text-white placeholder:text-zinc-500"
                    : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              />
            </div>
          </div>

          {/* Barcode & Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-zinc-300 block mb-1">
                Initial Stock Units *
              </label>
              <input
                type="number"
                required
                min="0"
                value={productForm.stock}
                onChange={(e) => setProductForm((p) => ({ ...p, stock: e.target.value }))}
                placeholder="100"
                className={`w-full text-xs font-bold px-3 py-2.5 rounded-xl border outline-none ${
                  darkMode
                    ? "bg-[#1A1D26] border-zinc-700 text-white placeholder:text-zinc-500"
                    : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-zinc-300 block mb-1">
                Badge / Tag
              </label>
              <input
                type="text"
                value={productForm.badge}
                onChange={(e) => setProductForm((p) => ({ ...p, badge: e.target.value }))}
                placeholder="Fresh / Bestseller"
                className={`w-full text-xs font-bold px-3 py-2.5 rounded-xl border outline-none ${
                  darkMode
                    ? "bg-[#1A1D26] border-zinc-700 text-white placeholder:text-zinc-500"
                    : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-zinc-300 block mb-1">
                Barcode Number
              </label>
              <input
                type="text"
                value={productForm.barcode}
                onChange={(e) => setProductForm((p) => ({ ...p, barcode: e.target.value }))}
                placeholder="8901..."
                className={`w-full text-xs font-mono font-bold px-3 py-2.5 rounded-xl border outline-none ${
                  darkMode
                    ? "bg-[#1A1D26] border-zinc-700 text-white placeholder:text-zinc-500"
                    : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              />
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-zinc-300 block mb-1">
              Image URL *
            </label>
            <input
              type="url"
              required
              value={productForm.img}
              onChange={(e) => setProductForm((p) => ({ ...p, img: e.target.value }))}
              placeholder="https://..."
              className={`w-full text-xs font-mono px-3 py-2.5 rounded-xl border outline-none ${
                darkMode
                  ? "bg-[#1A1D26] border-zinc-700 text-white placeholder:text-zinc-500"
                  : "bg-slate-50 border-slate-200 text-slate-900"
              }`}
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2 border-t border-slate-200/50 flex justify-end">
            <button
              type="submit"
              disabled={isPublishing}
              className="bg-[#FF5B00] hover:bg-[#E04E00] text-white font-black text-xs px-6 py-3 rounded-xl shadow-md transition-all cursor-pointer active:scale-95 flex items-center space-x-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{isPublishing ? "Publishing..." : "Publish Product to Store"}</span>
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
            <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-800 border border-slate-200/50 dark:border-zinc-750 relative">
              <img
                src={productForm.img || visualPalette[0]?.url}
                alt="Preview"
                className="w-full h-full object-cover"
              />
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
