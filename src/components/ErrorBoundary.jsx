import { Component } from "react";

/**
 * Stops one broken part of a screen from blanking the whole site.
 *
 * React unmounts the entire tree when a render throws and nothing catches it.
 * That is what shoppers saw after ordering: the order tracker threw, and every
 * shop page became an empty document.
 *
 * `quiet` hides just the broken part (the floating widgets). Without it the
 * page is replaced by a short message and a way back to the shop.
 * `resetKey` clears the error when it changes, so moving to another page
 * gives the screen a fresh start.
 */
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error(`[${this.props.name || "screen"}] failed to render`, error, info?.componentStack);
  }

  componentDidUpdate(prev) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    if (this.props.quiet) return null;

    return (
      <div className="min-h-screen bg-[#F6F5F1] dark:bg-surface flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-[20px] font-bold text-[#061838] dark:text-content">This page didn&apos;t load</h1>
        <p className="mt-1.5 max-w-xs text-[14.5px] text-slate-600 dark:text-content-muted">
          Something went wrong on our side. Your cart and orders are safe.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-11 px-5 rounded-xl bg-[#FF5B00] hover:bg-[#E04E00] text-white text-[15px] font-bold"
          >
            Try again
          </button>
          <a
            href="/shop/"
            className="h-11 px-5 rounded-xl border border-slate-300 text-[#061838] text-[15px] font-bold flex items-center dark:border-line dark:text-content"
          >
            Go to the shop
          </a>
        </div>
      </div>
    );
  }
}
