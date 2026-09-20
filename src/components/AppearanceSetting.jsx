import { Sun, Moon, Smartphone } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { hapticLight } from '../lib/haptics';

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'Auto', Icon: Smartphone },
];

/**
 * Appearance control for the account screen.
 *
 * A three-way segmented control rather than an on/off switch, because 'system'
 * is a real choice and not the absence of one — a binary toggle would force
 * everyone to re-pick a side every time their phone changed itself at sunset.
 *
 * The moving indicator is one absolutely-positioned element translated by the
 * selected index, not a Framer `layoutId` shared element. That is deliberate:
 * _app.js keeps the outgoing page mounted through a route transition, so for a
 * moment two copies of this control exist, and two elements claiming the same
 * layoutId make Framer project the indicator onto whichever copy it measured
 * last — which is the hidden one, still showing its pre-hydration default. A
 * plain transform has no cross-instance state to confuse.
 */
export default function AppearanceSetting() {
  const { preference, setPreference, hydrated } = useTheme();

  const index = Math.max(0, OPTIONS.findIndex((o) => o.value === preference));

  return (
    <div className="pt-2">
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 block mb-2 dark:text-content-faint">
        Appearance
      </span>

      <div className="bg-white border border-slate-200/90 rounded-3xl p-1.5 shadow-xs dark:bg-surface-raised dark:border-line/90">
        <div
          role="radiogroup"
          aria-label="Appearance"
          className="relative grid grid-cols-3"
        >
          {/* The indicator. Width is a third of the track and it slides by whole
              multiples of its own width, so it lands exactly on a segment
              without needing to measure anything. The slide is suppressed until
              the stored preference has been read, otherwise every visit to this
              screen opens with the indicator travelling from Light. */}
          <span
            aria-hidden="true"
            className={`absolute inset-y-0 left-0 w-1/3 rounded-2xl bg-slate-900 dark:bg-surface-muted ${
              hydrated ? 'transition-transform duration-300 ease-out' : ''
            }`}
            style={{ transform: `translateX(${index * 100}%)` }}
          />

          {OPTIONS.map(({ value, label, Icon }) => {
            const active = preference === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  hapticLight();
                  setPreference(value);
                }}
                className="relative z-10 flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl cursor-pointer"
              >
                <Icon
                  className={`w-4 h-4 stroke-[2.2] transition-colors ${
                    active
                      ? 'text-white dark:text-content'
                      : 'text-slate-500 dark:text-content-muted'
                  }`}
                />
                <span
                  className={`text-[11px] font-bold transition-colors ${
                    active
                      ? 'text-white dark:text-content'
                      : 'text-slate-600 dark:text-content-secondary'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-slate-400 font-medium px-1 mt-2 dark:text-content-faint">
        {preference === 'system'
          ? 'Follows your device setting.'
          : `Always ${preference}, whatever your device is set to.`}
      </p>
    </div>
  );
}
