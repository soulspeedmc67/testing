import React, { useState, useEffect } from "react";
import { Smartphone, Loader2 } from "lucide-react";
import {
  minIosVersionPatch,
  updateTextPatch,
  DEFAULT_UPDATE_TITLE,
  DEFAULT_UPDATE_MESSAGE,
  UPDATE_TITLE_MAX,
  UPDATE_MESSAGE_MAX,
} from "../../lib/appVersion";

/**
 * The oldest iPhone app that may still order. An installed app keeps the fees
 * it was built with, so an old one misses a charge added since. Older apps
 * show "Update DASHit" and can't be used; the ones from before that screen
 * existed have their orders refused. Saved on config/store (src/lib/appVersion.js).
 */
export default function AppUpdateSettings({ storeConfig = null, onSave, darkMode = false }) {
  const saved = String(storeConfig?.minIosVersion || "");
  const [version, setVersion] = useState(saved);
  const [saving, setSaving] = useState(false);
  const savedTitle = String(storeConfig?.updateTitle || "");
  const savedMessage = String(storeConfig?.updateMessage || "");
  const [title, setTitle] = useState(savedTitle);
  const [message, setMessage] = useState(savedMessage);
  const [savingText, setSavingText] = useState(false);

  // Another device may change the setting while this screen is open.
  useEffect(() => setVersion(saved), [saved]);
  useEffect(() => setTitle(savedTitle), [savedTitle]);
  useEffect(() => setMessage(savedMessage), [savedMessage]);

  const textChanged = title.trim() !== savedTitle || message.trim() !== savedMessage;
  const saveText = async (nextTitle, nextMessage) => {
    if (!onSave || savingText) return;
    setSavingText(true);
    try {
      await onSave(updateTextPatch(nextTitle, nextMessage), "Saved. Apps from version 1.0.4 on show these words on the update screen.");
    } catch (e) {
      // The console shows why; the boxes keep what was typed.
    } finally {
      setSavingText(false);
    }
  };

  const typed = version.trim();
  const patch = minIosVersionPatch(typed);
  const changed = typed !== saved;

  const save = async (next) => {
    if (!onSave || saving) return;
    const fields = minIosVersionPatch(next);
    if (!fields) return alert("Write the version the way the App Store shows it, like 1.0.3.");
    if (
      fields.minIosVersionCode > 0 &&
      !window.confirm(
        `iPhone apps older than ${fields.minIosVersion} will not be able to order until they update.\n\nOnly do this once version ${fields.minIosVersion} is on the App Store. Go ahead?`
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      await onSave(
        fields,
        fields.minIosVersionCode > 0
          ? `Saved. iPhone apps older than ${fields.minIosVersion} must update before they can order.`
          : "Saved. Every version of the iPhone app can order."
      );
    } catch (e) {
      // The console shows why; the box keeps what was typed.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`md:col-span-2 rounded-2xl border p-5 space-y-3 transition-colors ${
        darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
      }`}
    >
      <div className="flex items-center space-x-2">
        <Smartphone className="w-5 h-5 text-[#FF5B00]" />
        <h3 className="font-black text-sm text-slate-900 dark:text-white">iPhone app updates</h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-zinc-400">
        An app on a customer&apos;s phone keeps the fees it was made with, so an old one misses charges you added
        later. Put the oldest version you still accept here. Older iPhone apps show &quot;Update DASHit&quot; with a
        button to the App Store and can&apos;t be used until they update.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(typed);
        }}
        className="flex items-end gap-2 flex-wrap"
      >
        <div>
          <label htmlFor="min-ios-version" className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">
            Oldest version allowed
          </label>
          <input
            id="min-ios-version"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="e.g. 1.0.3"
            className={`w-32 text-xs font-bold px-3 py-2 rounded-xl border outline-none ${
              darkMode
                ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]"
                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF5B00]"
            }`}
          />
        </div>
        <button
          type="submit"
          disabled={saving || !changed || !patch}
          className="inline-flex items-center gap-1.5 bg-[#FF5B00] hover:bg-[#E04E00] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save
        </button>
        {saved && (
          <button
            type="button"
            disabled={saving}
            onClick={() => save("")}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
          >
            Allow every version
          </button>
        )}
      </form>

      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
        {saved
          ? `Now: iPhone apps older than ${saved} can't order.`
          : "Now: every version of the iPhone app can order."}{" "}
        {typed && !patch ? "Write it the way the App Store shows it, like 1.0.3. " : ""}
        Only put a version that is already on the App Store, or nobody on an iPhone can order. Apps from before this
        setting existed (1.0.2 and older) can&apos;t show the update screen: their order is refused instead. This does
        not change the website or the Android app.
      </p>

      {/* What the update screen says */}
      <div className="pt-3 mt-1 border-t border-slate-200 dark:border-zinc-800 space-y-3">
        <p className="text-xs font-black text-slate-900 dark:text-white">What the update screen says</p>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400">
          Write your own words, like &quot;₹50 is waiting in your wallet. Update to use it.&quot; Leave a box empty to use the
          built-in words. Only iPhone apps from version 1.0.4 on read this; older ones keep their built-in words.
        </p>
        <div>
          <label htmlFor="update-title" className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">Title</label>
          <input
            id="update-title"
            type="text"
            maxLength={UPDATE_TITLE_MAX}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={DEFAULT_UPDATE_TITLE}
            className={`w-full text-xs font-bold px-3 py-2 rounded-xl border outline-none ${
              darkMode ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF5B00]"
            }`}
          />
        </div>
        <div>
          <label htmlFor="update-message" className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">Message</label>
          <textarea
            id="update-message"
            rows={3}
            maxLength={UPDATE_MESSAGE_MAX}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={DEFAULT_UPDATE_MESSAGE}
            className={`w-full text-xs font-semibold px-3 py-2 rounded-xl border outline-none resize-none ${
              darkMode ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF5B00]"
            }`}
          />
          <p className="text-right text-[11px] text-slate-400">{message.length}/{UPDATE_MESSAGE_MAX}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 space-y-1.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">How it looks</p>
          <p className="text-base font-black text-slate-900 dark:text-white">{title.trim() || DEFAULT_UPDATE_TITLE}</p>
          <p className="text-xs text-slate-600 dark:text-zinc-300">{message.trim() || DEFAULT_UPDATE_MESSAGE}</p>
          <span className="inline-block mt-1 text-xs font-bold bg-[#FF5B00] text-white px-4 py-2 rounded-xl">Update on the App Store</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={savingText || !textChanged}
            onClick={() => saveText(title, message)}
            className="inline-flex items-center gap-1.5 bg-[#FF5B00] hover:bg-[#E04E00] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {savingText && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save the words
          </button>
          {(savedTitle || savedMessage) && (
            <button
              type="button"
              disabled={savingText}
              onClick={() => saveText("", "")}
              className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
            >
              Use the built-in words
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
