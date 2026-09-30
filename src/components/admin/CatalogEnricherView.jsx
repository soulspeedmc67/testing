import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  Eye,
  Check,
  X,
  FileSpreadsheet,
  ArrowRight,
  Sliders,
  Image as ImageIcon,
  Loader2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Store,
  Layers,
  HelpCircle,
  Key,
  Settings,
  EyeOff,
  Trash2,
  Wand2
} from "lucide-react";

/**
 * DASHit Automated Grocery Product Image & Catalog Enrichment Console.
 */
const getApiBase = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "localhost";
    return `${window.location.protocol}//${host}:5001`;
  }
  return "";
};

const resolveImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${getApiBase()}${url}`;
  return url;
};

export default function CatalogEnricherView({
  onSyncProductsToCatalog,
  darkMode = false,
  showToast = (msg) => console.log(msg),
}) {
  // State
  const [activeJobId, setActiveJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [jobItems, setJobItems] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  
  // CSV Input & Mapping
  const [rawCsvText, setRawCsvText] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [parsedHeaders, setParsedHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [previewRows, setPreviewRows] = useState([]);
  const [isConfiguringMapping, setIsConfiguringMapping] = useState(false);

  // Settings
  const [autoApproveThreshold, setAutoApproveThreshold] = useState(90);
  const [manualReviewThreshold, setManualReviewThreshold] = useState(75);
  const [cleanBg, setCleanBg] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("dashit_gemini_api_key");
      if (stored) {
        setGeminiApiKey(stored);
        setKeyStatus("valid");
        fetch(`${getApiBase()}/api/enrichment/settings/gemini`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ geminiApiKey: stored })
        }).catch(() => {});
      } else {
        fetch(`${getApiBase()}/api/enrichment/settings/gemini`)
          .then(r => r.json())
          .then(d => {
            if (d.configured && d.masked_key) {
              setKeyStatus("valid");
            }
          })
          .catch(() => {});
      }
    } catch (e) {}
  }, []);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState(null);
  const [showKeyPassword, setShowKeyPassword] = useState(false);

  // Review Drawer
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productCandidates, setProductCandidates] = useState([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [reSearchQuery, setReSearchQuery] = useState("");
  const [isSearchingAgain, setIsSearchingAgain] = useState(false);
  const [isGeneratingAiPackshot, setIsGeneratingAiPackshot] = useState(false);
  const [isCleaningBg, setIsCleaningBg] = useState(false);
  const [isGeneratingAiAll, setIsGeneratingAiAll] = useState(false);

  // Gemini API Key Verification & Sync
  const handleTestGeminiKey = async () => {
    if (!geminiApiKey.trim()) {
      showToast("Please enter an API key first.");
      return;
    }
    setIsTestingKey(true);
    setKeyStatus(null);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey.trim()}`);
      const data = await res.json();
      if (data.models && data.models.length > 0) {
        setKeyStatus("valid");
        localStorage.setItem("dashit_gemini_api_key", geminiApiKey.trim());
        fetch(`${getApiBase()}/api/enrichment/settings/gemini`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ geminiApiKey: geminiApiKey.trim() })
        }).catch(() => {});
        showToast("✓ Valid Google Gemini API Key! AI Vision & Packshot Refinement active.");
        return;
      } else {
        setKeyStatus("invalid");
        showToast(data.error?.message || "Invalid Gemini API Key.");
      }
    } catch (e) {
      // Fallback to backend test
      try {
        const backendRes = await fetch(`${getApiBase()}/api/enrichment/settings/gemini`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ geminiApiKey: geminiApiKey.trim() })
        });
        const backendData = await backendRes.json();
        if (backendData.valid) {
          setKeyStatus("valid");
          localStorage.setItem("dashit_gemini_api_key", geminiApiKey.trim());
          showToast("✓ Valid Google Gemini API Key! Saved successfully.");
          return;
        }
      } catch (beErr) {}
      setKeyStatus("invalid");
      showToast("Could not verify key. Please check your key at Google AI Studio.");
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleSaveKey = () => {
    if (geminiApiKey.trim()) {
      localStorage.setItem("dashit_gemini_api_key", geminiApiKey.trim());
      setKeyStatus("valid");
      fetch(`${getApiBase()}/api/enrichment/settings/gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiApiKey: geminiApiKey.trim() })
      }).catch(() => {});
      showToast("✓ Gemini API Key saved & activated!");
    } else {
      localStorage.removeItem("dashit_gemini_api_key");
      setKeyStatus(null);
      fetch(`${getApiBase()}/api/enrichment/settings/gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiApiKey: "" })
      }).catch(() => {});
      showToast("API Key removed. Standard OCR active.");
    }
    setIsSettingsOpen(false);
  };

  const handleClearKey = () => {
    setGeminiApiKey("");
    setKeyStatus(null);
    localStorage.removeItem("dashit_gemini_api_key");
    fetch(`${getApiBase()}/api/enrichment/settings/gemini`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ geminiApiKey: "" })
    }).catch(() => {});
    showToast("Gemini API Key cleared.");
  };

  const fileInputRef = useRef(null);
  const customImageRef = useRef(null);

  // Styling helper tokens
  const cardCls = darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs";
  const subtleText = darkMode ? "text-zinc-400" : "text-slate-500";
  const headingText = darkMode ? "text-white" : "text-slate-900";
  const inputCls = darkMode
    ? "bg-[#1A1D26] border-zinc-700 text-white placeholder:text-zinc-600 focus:border-[#FF5B00]"
    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#FF5B00]";

  // --- 1. File Handling & Column Auto-Detection ---
  const handleFileSelect = (file) => {
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target.result || "");
      setRawCsvText(text);
      inspectCsv(text);
    };
    reader.readAsText(file);
  };

  const inspectCsv = (text) => {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 1) return;

    // Detect delimiter
    const firstLine = lines[0];
    let delim = ",";
    for (const d of [";", "\t", "|"]) {
      if (firstLine.split(d).length > firstLine.split(delim).length) {
        delim = d;
      }
    }

    const headers = firstLine.split(delim).map(h => h.trim().replace(/^["']|["']$/g, ""));
    setParsedHeaders(headers);

    // Auto-detect mappings
    const autoMap = {};
    const norm = (str) => String(str).toLowerCase().replace(/[^a-z0-9]/g, "");
    
    const targets = {
      barcode: ["barcode", "ean", "upc", "sku", "id", "code"],
      name: ["name", "product_name", "item", "title", "product"],
      brand: ["brand", "company", "manufacturer"],
      category: ["category", "cat", "department"],
      unit: ["unit", "pack_size", "quantity", "qty", "size", "weight"],
      price: ["price", "selling_price", "rate"],
      mrp: ["mrp", "original_price", "originalprice", "list_price"],
      image: ["image", "img", "photo", "image_url"]
    };

    Object.keys(targets).forEach(key => {
      const aliases = targets[key];
      for (const h of headers) {
        const cleanH = norm(h);
        if (aliases.some(a => cleanH === norm(a) || cleanH.includes(norm(a)))) {
          autoMap[key] = h;
          break;
        }
      }
    });

    setColumnMapping(autoMap);

    // Build preview rows
    const previews = lines.slice(1, 5).map(line => {
      const cells = line.split(delim).map(c => c.trim().replace(/^["']|["']$/g, ""));
      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cells[idx] || "";
      });
      return rowObj;
    });
    setPreviewRows(previews);
    setIsConfiguringMapping(true);
  };

  // --- 2. Start Automated Enrichment ---
  const handleStartImport = async () => {
    if (!rawCsvText.trim()) return;
    setIsUploading(true);
    try {
      if (typeof window !== "undefined" && geminiApiKey) {
        localStorage.setItem("dashit_gemini_api_key", geminiApiKey.trim());
      }
      const res = await fetch(`${getApiBase()}/api/enrichment/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvContent: rawCsvText,
          filename: csvFileName || "catalog_upload.csv",
          mapping: columnMapping,
          autoApproveThreshold,
          manualReviewThreshold,
          cleanBg,
          geminiApiKey: geminiApiKey.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.jobId) {
        setActiveJobId(data.jobId);
        setIsConfiguringMapping(false);
        showToast(`Started enrichment for ${data.total} products.`);
      } else {
        showToast(data.message || "Failed to start enrichment.");
      }
    } catch (err) {
      console.error("Enrichment import error:", err);
      showToast(err?.message || "Error connecting to enrichment service.");
    } finally {
      setIsUploading(false);
    }
  };

  // --- Load recent jobs on mount ---
  useEffect(() => {
    fetch(`${getApiBase()}/api/enrichment/jobs`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.jobs && data.jobs.length > 0) {
          setActiveJobId(prev => prev || data.jobs[0].job_id);
        }
      })
      .catch(() => {});
  }, []);

  // --- 3. Poll Job Status & Items ---
  useEffect(() => {
    if (!activeJobId) return;

    let isMounted = true;
    let pollInterval = null;

    const fetchStatusAndItems = async () => {
      try {
        const jobRes = await fetch(`${getApiBase()}/api/enrichment/jobs/${activeJobId}`);
        const jobData = await jobRes.json();
        if (isMounted && jobData.success && jobData.job) {
          setJobStatus(jobData.job);

          // Fetch items
          const itemsRes = await fetch(`${getApiBase()}/api/enrichment/jobs/${activeJobId}/items?status=${statusFilter}`);
          const itemsData = await itemsRes.json();
          if (isMounted && itemsData.success) {
            setJobItems(itemsData.items || []);
          }

          if (jobData.job.status === "COMPLETED" && pollInterval) {
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.warn("Polling error:", err);
      }
    };

    fetchStatusAndItems();
    pollInterval = setInterval(fetchStatusAndItems, 1500);

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeJobId, statusFilter]);

  // --- 4. Product Candidate Inspection ---
  const handleInspectProduct = async (item) => {
    setSelectedProduct(item);
    setIsLoadingCandidates(true);
    setProductCandidates([]);
    setReSearchQuery(item.name || "");
    try {
      const prodId = item.product_id || item.barcode;
      const res = await fetch(`${getApiBase()}/api/enrichment/products/${prodId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedProduct(data.product);
        setProductCandidates(data.candidates || []);
      }
    } catch (e) {
      showToast("Could not load product candidates.");
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  // --- 5. Candidate Actions: Approve / Reject / Custom Upload / Re-Search ---
  const handleApproveCandidate = async (candidateId) => {
    if (!selectedProduct) return;
    try {
      const res = await fetch(`${getApiBase()}/api/enrichment/products/${selectedProduct.id}/approve-candidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Candidate approved & normalized to catalog.");
        handleInspectProduct(selectedProduct);
        refreshJobItems();
      } else {
        showToast(data.message || "Approval failed.");
      }
    } catch (e) {
      showToast("Failed to approve candidate.");
    }
  };

  const handleRejectProduct = async () => {
    if (!selectedProduct) return;
    try {
      await fetch(`${getApiBase()}/api/enrichment/products/${selectedProduct.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "MANUAL_REJECTED" }),
      });
      showToast("Product marked as rejected.");
      handleInspectProduct(selectedProduct);
      refreshJobItems();
    } catch (e) {
      showToast("Error rejecting product.");
    }
  };

  const handleCustomImageUpload = async (file) => {
    if (!file || !selectedProduct) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target.result;
      try {
        const res = await fetch(`${getApiBase()}/api/enrichment/products/${selectedProduct.id}/upload-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Data,
            filename: file.name,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast("Custom image normalized & assigned!");
          handleInspectProduct(selectedProduct);
          refreshJobItems();
        } else {
          showToast(data.message || "Upload failed.");
        }
      } catch (err) {
        showToast("Upload failed.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSearchAgain = async () => {
    if (!selectedProduct || !reSearchQuery.trim()) return;
    setIsSearchingAgain(true);
    try {
      const res = await fetch(`${getApiBase()}/api/enrichment/products/${selectedProduct.id}/search-again`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: reSearchQuery }),
      });
      const data = await res.json();
      if (data.success) {
        setProductCandidates(data.candidates || []);
        showToast(`Found ${data.candidates_found} new candidate images.`);
      }
    } catch (e) {
      showToast("Search failed.");
    } finally {
      setIsSearchingAgain(false);
    }
  };

  const handleGenerateAiPackshot = async () => {
    if (!selectedProduct) return;
    setIsGeneratingAiPackshot(true);
    try {
      const prodId = selectedProduct.id || selectedProduct.barcode;
      const res = await fetch(`${getApiBase()}/api/enrichment/products/${prodId}/generate-ai-packshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiApiKey: geminiApiKey.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("✓ High-quality studio packshot generated on pure white background!");
        handleInspectProduct(selectedProduct);
        refreshJobItems();
      } else {
        showToast(data.message || "Failed to generate packshot.");
      }
    } catch (err) {
      showToast("Error generating studio packshot.");
    } finally {
      setIsGeneratingAiPackshot(false);
    }
  };

  const handleCleanBackground = async () => {
    if (!selectedProduct) return;
    setIsCleaningBg(true);
    try {
      const prodId = selectedProduct.id || selectedProduct.barcode;
      const res = await fetch(`${getApiBase()}/api/enrichment/products/${prodId}/clean-background`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.success) {
        showToast("✓ Background removed! Centered on pure white #FFFFFF canvas.");
        handleInspectProduct(selectedProduct);
        refreshJobItems();
      } else {
        showToast(data.message || "Background removal failed.");
      }
    } catch (err) {
      showToast("Error processing background removal.");
    } finally {
      setIsCleaningBg(false);
    }
  };

  const refreshJobItems = async () => {
    if (!activeJobId) return;
    try {
      const res = await fetch(`${getApiBase()}/api/enrichment/jobs/${activeJobId}/items?status=${statusFilter}`);
      const data = await res.json();
      if (data.success) {
        setJobItems(data.items || []);
      }
    } catch (e) {}
  };

  // --- 6. Sync To DASHit Store Catalog ---
  const handleSyncToDashit = async () => {
    if (!activeJobId) return;
    try {
      const res = await fetch(`${getApiBase()}/api/enrichment/jobs/${activeJobId}/sync-dashit`, { method: "POST" });
      const data = await res.json();
      if (data.success && data.products) {
        if (onSyncProductsToCatalog) {
          onSyncProductsToCatalog(data.products);
        }
        showToast(`Successfully synced ${data.synced_count} verified products to DASHit!`);
      }
    } catch (e) {
      showToast("Sync failed.");
    }
  };

  // Bulk AI Image Generation for Entire Job
  const handleGenerateAiForJob = async (target = "UNRESOLVED") => {
    if (!activeJobId) return;
    setIsGeneratingAiAll(true);
    try {
      const res = await fetch(`${getApiBase()}/api/enrichment/jobs/${activeJobId}/generate-ai-packshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          geminiApiKey: geminiApiKey.trim() || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `✓ Generated AI images for products!`);
        await refreshJobItems();
        // Refresh job counters
        const jRes = await fetch(`${getApiBase()}/api/enrichment/jobs/${activeJobId}`);
        const jData = await jRes.json();
        if (jData.success && jData.job) {
          setJobStatus(jData.job);
        }
      } else {
        showToast(data.message || "Bulk AI generation failed.");
      }
    } catch (err) {
      showToast("Error executing bulk AI generation.");
    } finally {
      setIsGeneratingAiAll(false);
    }
  };

  // Filtered Items for display
  const displayedItems = useMemo(() => {
    if (!searchQuery.trim()) return jobItems;
    const q = searchQuery.toLowerCase();
    return jobItems.filter(i => 
      (i.name && i.name.toLowerCase().includes(q)) ||
      (i.barcode && String(i.barcode).toLowerCase().includes(q)) ||
      (i.brand && i.brand.toLowerCase().includes(q))
    );
  }, [jobItems, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* --- Top Header & Controls --- */}
      <div className={`p-6 rounded-3xl border transition-colors ${cardCls}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-orange-500/10 text-[#FF5B00]">
                <Sparkles className="w-6 h-6" />
              </div>
              <h1 className={`text-xl font-black ${headingText}`}>
                Automated Catalog & Image Enricher
              </h1>
            </div>
            <p className={`text-xs ${subtleText} mt-1.5 max-w-2xl`}>
              Multi-source grocery packaging retrieval, strict OCR packaging validation, 
              perceptual deduplication, and automated 1:1 WebP normalization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border flex items-center space-x-1.5 transition-colors cursor-pointer ${
                mounted && geminiApiKey
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : darkMode ? "border-zinc-700 hover:bg-zinc-800 text-zinc-300" : "border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}
            >
              <Key className="w-3.5 h-3.5 text-[#FF5B00]" />
              <span>{mounted && geminiApiKey ? "Gemini AI Active" : "AI Settings (API Key)"}</span>
            </button>

            <button
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="bg-[#FF5B00] hover:bg-[#E04E00] text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center space-x-2 active:scale-95 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Upload CSV</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />

            {activeJobId && (
              <>
                <a
                  href={`${getApiBase()}/api/enrichment/jobs/${activeJobId}/export/enriched`}
                  download
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border flex items-center space-x-1.5 transition-colors ${
                    darkMode ? "border-zinc-700 hover:bg-zinc-800 text-zinc-200" : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Enriched CSV</span>
                </a>
                <a
                  href={`${getApiBase()}/api/enrichment/jobs/${activeJobId}/export/failed`}
                  download
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border flex items-center space-x-1.5 transition-colors ${
                    darkMode ? "border-zinc-700 hover:bg-zinc-800 text-zinc-200" : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-rose-500" />
                  <span>Failed CSV</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleGenerateAiForJob("UNRESOLVED")}
                  disabled={isGeneratingAiAll}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center space-x-2 active:scale-95 transition-all disabled:opacity-50"
                  title="Generate commercial studio packshots on pure white #FFFFFF for all missing & review items in this job"
                >
                  {isGeneratingAiAll ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  )}
                  <span>{isGeneratingAiAll ? "Generating AI Images..." : "Generate AI Images for All"}</span>
                </button>
                <button
                  onClick={handleSyncToDashit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center space-x-2 active:scale-95 transition-all"
                >
                  <Store className="w-4 h-4" />
                  <span>Sync to Store</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* --- Metric Counters --- */}
        {jobStatus && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-zinc-800/80">
            <div className={`p-3.5 rounded-2xl border ${darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-slate-50 border-slate-100"}`}>
              <span className={`text-[11px] font-bold ${subtleText} block`}>Total Products</span>
              <span className={`text-xl font-black ${headingText} mt-0.5 block`}>{jobStatus.total_items}</span>
            </div>
            <div className={`p-3.5 rounded-2xl border ${darkMode ? "bg-emerald-950/20 border-emerald-900/30" : "bg-emerald-50/70 border-emerald-100"}`}>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Auto-Approved</span>
              </span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                {jobStatus.approved_items}
              </span>
            </div>
            <div className={`p-3.5 rounded-2xl border ${darkMode ? "bg-amber-950/20 border-amber-900/30" : "bg-amber-50/70 border-amber-100"}`}>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Review Needed</span>
              </span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5 block">
                {jobStatus.review_items}
              </span>
            </div>
            <div className={`p-3.5 rounded-2xl border ${darkMode ? "bg-rose-950/20 border-rose-900/30" : "bg-rose-50/70 border-rose-100"}`}>
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center space-x-1">
                <XCircle className="w-3 h-3" />
                <span>Failed</span>
              </span>
              <span className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5 block">
                {jobStatus.failed_items}
              </span>
            </div>
            <div className={`p-3.5 rounded-2xl border ${darkMode ? "bg-blue-950/20 border-blue-900/30" : "bg-blue-50/70 border-blue-100"}`}>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block">Match Rate</span>
              <span className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5 block">
                {jobStatus.total_items > 0 ? Math.round(((jobStatus.approved_items + jobStatus.review_items) / jobStatus.total_items) * 100) : 0}%
              </span>
            </div>
          </div>
        )}

        {/* --- Batch AI Packshot Generation Callout for Missing Items --- */}
        {jobStatus && (jobStatus.failed_items > 0 || jobStatus.review_items > 0) && (
          <div className="mt-5 p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 dark:bg-purple-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                <Sparkles className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className={`text-xs font-black ${headingText}`}>
                  {(jobStatus.failed_items || 0) + (jobStatus.review_items || 0)} products need commercial packshots
                </p>
                <p className={`text-[11px] ${subtleText}`}>
                  Synthesize 1024×1024 commercial packaging packshots on seamless pure white #FFFFFF backgrounds in one click.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => handleGenerateAiForJob("UNRESOLVED")}
                disabled={isGeneratingAiAll}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center space-x-2 cursor-pointer shadow-xs active:scale-95 transition-all disabled:opacity-50"
              >
                {isGeneratingAiAll ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                <span>{isGeneratingAiAll ? "Generating..." : "Generate for Unresolved"}</span>
              </button>
              <button
                type="button"
                onClick={() => handleGenerateAiForJob("ALL")}
                disabled={isGeneratingAiAll}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  darkMode ? "border-zinc-700 hover:bg-zinc-800 text-zinc-300" : "border-slate-300 hover:bg-slate-100 text-slate-700"
                }`}
                title="Regenerate AI studio packshots for all items in this job"
              >
                Regenerate All
              </button>
            </div>
          </div>
        )}

        {/* --- Live Progress Bar --- */}
        {jobStatus && jobStatus.status === "PROCESSING" && (
          <div className="mt-5 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-[#FF5B00] flex items-center space-x-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing candidates, OCR text & image normalization...</span>
              </span>
              <span className={`font-semibold ${subtleText}`}>
                {jobStatus.processed_items} of {jobStatus.total_items} ({Math.round((jobStatus.processed_items / jobStatus.total_items) * 100)}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-[#FF5B00] transition-all duration-300"
                style={{ width: `${(jobStatus.processed_items / Math.max(1, jobStatus.total_items)) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* --- Prominent Gemini AI Vision & Image Refinement Configuration Card --- */}
      <div className={`p-6 rounded-3xl border transition-colors ${cardCls} shadow-sm space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-[#FF5B00]/20 text-[#FF5B00] border border-orange-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h2 className={`text-base font-black ${headingText}`}>
                  Google Gemini AI Vision & Studio Image Refinement
                </h2>
                {mounted && (keyStatus === "valid" || geminiApiKey) ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Gemini 1.5 Flash Active</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Key Not Configured (Using Standard OCR)</span>
                  </span>
                )}
              </div>
              <p className={`text-xs ${subtleText} mt-1 max-w-2xl`}>
                Multimodal packaging label reading, verify Hindi/English brand names & pack sizes (e.g. 500g vs 1kg), 
                and automatically refine quick-commerce packshots with studio sharpness and vibrancy.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-[#FF5B00] hover:text-[#E04E00] flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition-colors"
            >
              <span>Get Free Key (Google AI Studio)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* API Key Input Form */}
        <div className="space-y-2">
          <label className={`text-xs font-bold ${headingText} flex items-center justify-between`}>
            <span className="flex items-center space-x-1.5">
              <Key className="w-3.5 h-3.5 text-[#FF5B00]" />
              <span>Enter your Google Gemini API Key:</span>
            </span>
            <span className={`text-[11px] font-normal ${subtleText}`}>
              Stored safely in local browser & server environment
            </span>
          </label>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type={showKeyPassword ? "text" : "password"}
                placeholder="AIzaSy... (Paste your Google Gemini API Key here)"
                value={geminiApiKey}
                onChange={(e) => {
                  setGeminiApiKey(e.target.value);
                  setKeyStatus(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveKey();
                }}
                className={`w-full pl-4 pr-10 py-2.5 rounded-xl text-xs border font-mono ${inputCls}`}
              />
              <button
                type="button"
                onClick={() => setShowKeyPassword(!showKeyPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                title={showKeyPassword ? "Hide API key" : "Show API key"}
              >
                {showKeyPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleTestGeminiKey}
                disabled={isTestingKey || !geminiApiKey.trim()}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold border flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                  darkMode
                    ? "border-zinc-700 hover:bg-zinc-800 text-zinc-200"
                    : "border-slate-200 hover:bg-slate-100 text-slate-700"
                }`}
              >
                {isTestingKey ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#FF5B00]" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                )}
                <span>{isTestingKey ? "Validating..." : "Test Connection"}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveKey}
                disabled={!geminiApiKey.trim()}
                className="bg-[#FF5B00] hover:bg-[#E04E00] text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center space-x-1.5 disabled:opacity-50 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Save Key</span>
              </button>

              {mounted && geminiApiKey && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  className={`p-2.5 rounded-xl border text-slate-400 hover:text-rose-500 hover:border-rose-500/30 transition-colors cursor-pointer ${
                    darkMode ? "border-zinc-800 hover:bg-rose-950/20" : "border-slate-200 hover:bg-rose-50"
                  }`}
                  title="Remove API Key"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Validation Status Notice */}
        {mounted && keyStatus === "valid" && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              <strong>Gemini Vision AI is successfully connected!</strong> Packaging OCR, brand consistency checks, and unsharp studio packshot polish will be applied automatically during catalog enrichment.
            </span>
          </div>
        )}

        {mounted && keyStatus === "invalid" && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center space-x-2 animate-in fade-in">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Invalid API Key:</strong> Google rejected this key. Please double check that you copied the complete key starting with <code className="font-mono bg-rose-500/20 px-1 py-0.5 rounded">AIzaSy...</code> from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-bold">Google AI Studio</a>.
            </span>
          </div>
        )}

        {/* Image Refinement Pipeline Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className={`p-3 rounded-2xl border ${darkMode ? "bg-zinc-900/40 border-zinc-800" : "bg-slate-50 border-slate-100"}`}>
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              <span className="p-1 rounded-lg bg-orange-500/10 text-[#FF5B00]">1</span>
              <span>Vision Packaging Inspection</span>
            </div>
            <p className={`text-[11px] ${subtleText} leading-relaxed`}>
              Inspects packaging labels in English & Hindi, verifying exact product names, net weights (500g vs 1kg), and MRP directly from images.
            </p>
          </div>

          <div className={`p-3 rounded-2xl border ${darkMode ? "bg-zinc-900/40 border-zinc-800" : "bg-slate-50 border-slate-100"}`}>
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500">2</span>
              <span>Studio Packshot Refinement</span>
            </div>
            <p className={`text-[11px] ${subtleText} leading-relaxed`}>
              Normalizes to 1024x1024 1:1 WebP with pure #FFFFFF studio background, unsharp masking (+25%) for razor-sharp typography, and vibrant packaging colors (+8%).
            </p>
          </div>

          <div className={`p-3 rounded-2xl border ${darkMode ? "bg-zinc-900/40 border-zinc-800" : "bg-slate-50 border-slate-100"}`}>
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              <span className="p-1 rounded-lg bg-blue-500/10 text-blue-500">3</span>
              <span>Zero Mismatch Gate</span>
            </div>
            <p className={`text-[11px] ${subtleText} leading-relaxed`}>
              Rejects wrong pack sizes (-35 penalty), blurry thumbnails, recipes, or logos. Only authentic e-commerce packshots are auto-approved.
            </p>
          </div>
        </div>
      </div>

      {/* --- Column Mapping Modal / Panel --- */}
      {isConfiguringMapping && (
        <div className={`p-6 rounded-3xl border transition-colors ${cardCls} space-y-5 animate-in fade-in duration-200`}>
          <div className="flex items-center justify-between border-b pb-4 border-slate-100 dark:border-zinc-800">
            <div>
              <h2 className={`text-base font-black ${headingText} flex items-center space-x-2`}>
                <Sliders className="w-5 h-5 text-[#FF5B00]" />
                <span>Verify CSV Column Mapping ({csvFileName})</span>
              </h2>
              <p className={`text-xs ${subtleText} mt-0.5`}>
                We auto-detected your grocery headers. Confirm or tweak which column supplies each property.
              </p>
            </div>
            <button
              onClick={() => setIsConfiguringMapping(false)}
              className={`p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { id: "barcode", label: "Barcode / EAN / UPC", required: false },
              { id: "name", label: "Product Name", required: true },
              { id: "brand", label: "Brand / Manufacturer", required: false },
              { id: "unit", label: "Pack Size / Quantity", required: false },
              { id: "category", label: "Category", required: false },
              { id: "price", label: "Selling Price", required: false },
              { id: "mrp", label: "MRP Rate", required: false },
              { id: "image", label: "Existing Image (Optional)", required: false },
            ].map(({ id, label, required }) => (
              <div key={id} className="space-y-1.5">
                <label className={`text-xs font-bold ${headingText} flex items-center justify-between`}>
                  <span>{label}</span>
                  {required && <span className="text-[10px] text-[#FF5B00] font-black">*Required</span>}
                </label>
                <select
                  value={columnMapping[id] || ""}
                  onChange={(e) => setColumnMapping({ ...columnMapping, [id]: e.target.value })}
                  className={`w-full px-3 py-2 text-xs font-bold rounded-xl border outline-none cursor-pointer ${inputCls}`}
                >
                  <option value="">-- Ignore --</option>
                  {parsedHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Settings Accordion */}
          <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className={`text-xs font-bold ${headingText} flex justify-between`}>
                <span>Auto-Approve Threshold</span>
                <span className="text-[#FF5B00] font-black">{autoApproveThreshold}%</span>
              </label>
              <input
                type="range"
                min="80"
                max="98"
                value={autoApproveThreshold}
                onChange={(e) => setAutoApproveThreshold(Number(e.target.value))}
                className="w-full accent-[#FF5B00]"
              />
              <span className={`text-[10px] ${subtleText}`}>Exact matches scoring above this will auto-finalize.</span>
            </div>

            <div className="space-y-1">
              <label className={`text-xs font-bold ${headingText} flex justify-between`}>
                <span>Manual Review Threshold</span>
                <span className="text-amber-500 font-black">{manualReviewThreshold}%</span>
              </label>
              <input
                type="range"
                min="60"
                max="85"
                value={manualReviewThreshold}
                onChange={(e) => setManualReviewThreshold(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <span className={`text-[10px] ${subtleText}`}>Scores between this and auto-approve require review.</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-200/50 dark:border-zinc-800">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="cleanBgCheck"
                  checked={cleanBg}
                  onChange={(e) => setCleanBg(e.target.checked)}
                  className="w-4 h-4 accent-[#FF5B00] rounded cursor-pointer"
                />
                <label htmlFor="cleanBgCheck" className={`text-xs font-bold ${headingText} cursor-pointer`}>
                  AI Background Cleanup (rembg)
                  <span className={`text-[10px] ${subtleText} block font-normal`}>Isolate product onto clean white canvas</span>
                </label>
              </div>

              <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  Studio Polish Active: Auto-Sharpen & Color Boost
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-3 border-t border-slate-200/50 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <label className={`text-xs font-bold ${headingText} flex items-center space-x-1.5`}>
                  <Sparkles className="w-3.5 h-3.5 text-[#FF5B00]" />
                  <span>Google Gemini Vision API Key (Optional AI Label Verification)</span>
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-[#FF5B00] hover:underline font-semibold flex items-center space-x-1"
                >
                  <span>Get free key</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <input
                type="password"
                placeholder="AIzaSy... (leave blank to use local deterministic OCR matching)"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl text-xs border ${inputCls}`}
              />
              <span className={`text-[10px] ${subtleText} block`}>
                Uses Gemini Multimodal Vision to inspect Indian packaging text, net weights, and variant banners directly.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              onClick={() => setIsConfiguringMapping(false)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                darkMode ? "border-zinc-700 hover:bg-zinc-800 text-zinc-300" : "border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleStartImport}
              disabled={isUploading || !columnMapping.name}
              className="bg-[#FF5B00] hover:bg-[#E04E00] text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center space-x-2 disabled:opacity-50 transition-all"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Process Catalog & Enrich Images</span>
            </button>
          </div>
        </div>
      )}

      {/* --- Filter & Search Controls --- */}
      {jobStatus && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 w-full sm:w-auto overflow-x-auto">
            {[
              { id: "ALL", label: "All Items" },
              { id: "MANUAL_REVIEW", label: `Review Required (${jobStatus.review_items})` },
              { id: "AUTO_APPROVED", label: `Verified (${jobStatus.approved_items})` },
              { id: "FAILED", label: `Failed (${jobStatus.failed_items})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-white dark:bg-[#1A1D26] text-slate-900 dark:text-white shadow-xs"
                    : `${subtleText} hover:text-slate-900 dark:hover:text-white`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, brand, barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border outline-none ${inputCls}`}
            />
          </div>
        </div>
      )}

      {/* --- Enriched Product Grid --- */}
      {displayedItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedItems.map((item, idx) => {
            const isApproved = item.status === "AUTO_APPROVED";
            const isReview = item.status === "MANUAL_REVIEW";
            const isFailed = item.status === "FAILED";

            return (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${cardCls} hover:border-[#FF5B00]/40`}
              >
                <div className="flex items-start space-x-3.5">
                  <div className="w-16 h-16 rounded-xl bg-white border border-slate-200/80 dark:border-zinc-700/80 overflow-hidden shrink-0 flex items-center justify-center relative shadow-xs">
                    {item.image_url ? (
                      <img
                        src={resolveImageUrl(item.thumbnail_url || item.image_url)}
                        alt={item.name}
                        className="w-full h-full object-contain p-1 bg-white"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400 dark:text-zinc-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      {isApproved && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                          <Check className="w-2.5 h-2.5" />
                          <span>Verified ({Math.round((item.confidence || 0.95) * 100)}%)</span>
                        </span>
                      )}
                      {isReview && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>Review Required ({Math.round((item.confidence || 0.75) * 100)}%)</span>
                        </span>
                      )}
                      {isFailed && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center space-x-1">
                          <X className="w-2.5 h-2.5" />
                          <span>Failed</span>
                        </span>
                      )}
                    </div>

                    <h3 className={`text-xs font-bold ${headingText} truncate mt-1`}>
                      {item.name}
                    </h3>
                    <p className={`text-[11px] ${subtleText} font-semibold truncate`}>
                      {item.brand && `${item.brand} · `}{item.pack_size || "1 pc"} · ₹{item.price || 0}
                    </p>
                    {item.barcode && (
                      <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 block truncate">
                        Barcode: {item.barcode}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reason / OCR Details */}
                {item.failure_reason && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400/90 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 leading-tight">
                    {item.failure_reason}
                  </p>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
                  <span className={`text-[10px] ${subtleText} font-medium`}>
                    Source: {item.image_source === "master_fmcg_asset_bank" ? "🏛️ Master Asset Bank" : (item.image_source || "Unassigned")}
                  </span>
                  <button
                    onClick={() => handleInspectProduct(item)}
                    className="text-xs font-black text-[#FF5B00] hover:text-[#E04E00] flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Inspect Candidates</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : activeJobId ? (
        <div className={`p-12 text-center rounded-3xl border ${cardCls}`}>
          <Search className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className={`text-xs font-bold ${subtleText}`}>No products match the selected status filter.</p>
        </div>
      ) : null}

      {/* --- Candidate Inspection Modal / Drawer --- */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border p-6 space-y-6 animate-in zoom-in-95 duration-150 ${darkMode ? "bg-[#14161E] border-zinc-700" : "bg-white border-slate-200"}`}>
            {/* Header */}
            <div className="flex items-start justify-between border-b pb-4 border-slate-100 dark:border-zinc-800">
              <div>
                <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                  Product Verification & Review
                </span>
                <h2 className={`text-lg font-black ${headingText} mt-0.5`}>
                  {selectedProduct.name}
                </h2>
                <p className={`text-xs ${subtleText} font-semibold mt-0.5`}>
                  Brand: {selectedProduct.brand || "N/A"} · Pack Size: {selectedProduct.pack_size || "N/A"} · Barcode: {selectedProduct.barcode || "N/A"}
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Active Packshot Display */}
            {selectedProduct.image_url && (
              <div className="flex items-center space-x-4 p-3.5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60">
                <div className="w-16 h-16 rounded-xl bg-white border border-slate-200/80 dark:border-zinc-700/80 p-1 shrink-0 flex items-center justify-center overflow-hidden shadow-xs">
                  <img
                    src={resolveImageUrl(selectedProduct.thumbnail_url || selectedProduct.image_url)}
                    alt={selectedProduct.name}
                    className="w-full h-full object-contain bg-white"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                      Assigned Catalog Master Image
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Pure White #FFFFFF
                    </span>
                  </div>
                  <p className={`text-xs font-bold ${headingText} truncate mt-0.5`}>
                    {selectedProduct.name}
                  </p>
                  <p className={`text-[10px] ${subtleText} font-mono mt-0.5 truncate`}>
                    Source: {selectedProduct.image_source || "Catalog Master"}
                  </p>
                </div>
              </div>
            )}

            {/* Re-Search & AI Generation Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Re-search candidate images with custom query..."
                  value={reSearchQuery}
                  onChange={(e) => setReSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchAgain()}
                  className={`w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border outline-none ${inputCls}`}
                />
              </div>
              <button
                onClick={handleSearchAgain}
                disabled={isSearchingAgain}
                className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 px-4 py-2 rounded-xl text-xs font-black shrink-0 cursor-pointer flex items-center space-x-1.5"
              >
                {isSearchingAgain ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Search</span>
              </button>

              <button
                type="button"
                onClick={handleCleanBackground}
                disabled={isCleaningBg}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black shrink-0 cursor-pointer flex items-center space-x-1.5 shadow-xs active:scale-95 transition-all disabled:opacity-50"
                title="Remove background/supermarket shelves from image and isolate on pure white #FFFFFF canvas"
              >
                {isCleaningBg ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5 text-emerald-200" />
                )}
                <span>{isCleaningBg ? "Cleaning BG..." : "Clean to White BG"}</span>
              </button>

              <button
                type="button"
                onClick={handleGenerateAiPackshot}
                disabled={isGeneratingAiPackshot}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-black shrink-0 cursor-pointer flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                title="Synthesize a 1024x1024 commercial packshot on pure white #FFFFFF background"
              >
                {isGeneratingAiPackshot ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span>{isGeneratingAiPackshot ? "Synthesizing AI Packshot..." : "Generate AI Packshot"}</span>
              </button>

              <button
                onClick={() => customImageRef.current && customImageRef.current.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-black shrink-0 cursor-pointer flex items-center space-x-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Custom</span>
              </button>
              <input
                type="file"
                ref={customImageRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => handleCustomImageUpload(e.target.files?.[0])}
              />
            </div>

            {/* Candidates Comparison Grid */}
            <div className="space-y-3">
              <h3 className={`text-xs font-black ${headingText} uppercase tracking-wider flex items-center justify-between`}>
                <span>Candidate Packaging Images ({productCandidates.length})</span>
                <span className={`text-[10px] ${subtleText} font-normal`}>Click any candidate to assign it directly</span>
              </h3>

              {isLoadingCandidates ? (
                <div className="py-12 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#FF5B00] mx-auto" />
                  <p className={`text-xs ${subtleText}`}>Fetching candidate packshots...</p>
                </div>
              ) : productCandidates.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {productCandidates.map((cand, cIdx) => (
                    <div
                      key={cIdx}
                      className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                        cand.is_selected
                          ? "border-[#FF5B00] bg-orange-500/5 dark:bg-orange-500/10"
                          : `${darkMode ? "bg-zinc-900/60 border-zinc-800" : "bg-slate-50 border-slate-200/80"}`
                      }`}
                    >
                      <div className="aspect-square rounded-xl bg-white p-2 flex items-center justify-center overflow-hidden border border-slate-200/80 dark:border-zinc-700/80 relative shadow-xs">
                        <img
                          src={resolveImageUrl(cand.url)}
                          alt="Candidate packshot"
                          className="w-full h-full object-contain bg-white"
                        />
                        {cand.is_selected && (
                          <div className="absolute top-2 right-2 bg-[#FF5B00] text-white p-1 rounded-full shadow-md">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[#FF5B00]">
                            {Math.round((cand.confidence || 0) * 100)}% Match
                          </span>
                          <span className={`text-[10px] font-mono ${subtleText}`}>
                            {cand.width && cand.height ? `${cand.width}x${cand.height}` : "Web Standard"}
                          </span>
                        </div>
                        {cand.source_name === "ai_studio_generated" ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            <Sparkles className="w-2.5 h-2.5 text-purple-500" />
                            <span>AI Studio Packshot (White BG)</span>
                          </span>
                        ) : cand.source_name === "master_fmcg_asset_bank" ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <Check className="w-2.5 h-2.5 text-emerald-500" />
                            <span>🏛️ Master FMCG Studio Asset (White BG)</span>
                          </span>
                        ) : (
                          <p className={`text-[10px] ${subtleText} truncate font-semibold`}>
                            Source: {cand.source_name || "Catalog Source"}
                          </p>
                        )}
                        {cand.reason && (
                          <p className="text-[10px] text-slate-600 dark:text-zinc-400 line-clamp-2 leading-tight">
                            {cand.reason}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleApproveCandidate(cand.id)}
                        className={`w-full py-2 rounded-xl text-xs font-black cursor-pointer shadow-xs active:scale-95 transition-all flex items-center justify-center space-x-1.5 ${
                          cand.is_selected
                            ? "bg-emerald-600 text-white"
                            : "bg-[#FF5B00] hover:bg-[#E04E00] text-white"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{cand.is_selected ? "Currently Assigned" : "Choose This Image"}</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`p-8 text-center rounded-2xl border ${darkMode ? "border-zinc-800" : "border-slate-200"}`}>
                  <p className={`text-xs ${subtleText}`}>No candidate images found yet. Try alternate keywords above or upload an image.</p>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center">
              <button
                onClick={handleRejectProduct}
                className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-500/10 cursor-pointer flex items-center space-x-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Product</span>
              </button>

              <button
                onClick={() => setSelectedProduct(null)}
                className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 px-6 py-2 rounded-xl text-xs font-black cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- AI & Pipeline Configuration Modal --- */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`max-w-xl w-full rounded-3xl border p-6 space-y-5 shadow-2xl ${cardCls} animate-in fade-in zoom-in-95 duration-150`}>
            <div className="flex items-center justify-between border-b pb-4 border-slate-100 dark:border-zinc-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-orange-500/10 text-[#FF5B00]">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`text-base font-black ${headingText}`}>
                    Pipeline & AI Settings
                  </h2>
                  <p className={`text-xs ${subtleText}`}>
                    Configure Google Gemini Vision AI and automated image refinement.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Google Gemini Vision API Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={`text-xs font-bold ${headingText} flex items-center space-x-1.5`}>
                  <Key className="w-3.5 h-3.5 text-[#FF5B00]" />
                  <span>Google Gemini Vision API Key</span>
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#FF5B00] hover:underline font-bold flex items-center space-x-1"
                >
                  <span>Get free key (30s)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative">
                <input
                  type={showKeyPassword ? "text" : "password"}
                  placeholder="AIzaSy... (Paste Gemini API key)"
                  value={geminiApiKey}
                  onChange={(e) => {
                    setGeminiApiKey(e.target.value);
                    setKeyStatus(null);
                  }}
                  className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl text-xs border font-mono ${inputCls}`}
                />
                <button
                  type="button"
                  onClick={() => setShowKeyPassword(!showKeyPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  {showKeyPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className={subtleText}>Used for Multimodal Vision verification & packaging OCR.</span>
                <button
                  type="button"
                  onClick={handleTestGeminiKey}
                  disabled={isTestingKey || !geminiApiKey.trim()}
                  className="text-xs font-bold text-[#FF5B00] hover:underline flex items-center space-x-1 disabled:opacity-50 cursor-pointer"
                >
                  {isTestingKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3 text-emerald-500" />}
                  <span>{isTestingKey ? "Validating..." : "Test Connection"}</span>
                </button>
              </div>
            </div>

            {/* Quality Thresholds */}
            <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <h3 className={`text-xs font-bold uppercase tracking-wider ${subtleText}`}>
                Quality Control Thresholds
              </h3>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className={headingText}>Auto-Approve Threshold</span>
                  <span className="text-emerald-600 font-mono">{autoApproveThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="98"
                  value={autoApproveThreshold}
                  onChange={(e) => setAutoApproveThreshold(Number(e.target.value))}
                  className="w-full accent-[#FF5B00] cursor-pointer"
                />
                <p className={`text-[10px] ${subtleText}`}>
                  Images scoring above this threshold are automatically accepted and converted to 1:1 WebP.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className={headingText}>Manual Review Threshold</span>
                  <span className="text-amber-600 font-mono">{manualReviewThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="85"
                  value={manualReviewThreshold}
                  onChange={(e) => setManualReviewThreshold(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <p className={`text-[10px] ${subtleText}`}>
                  Images scoring between {manualReviewThreshold}% and {autoApproveThreshold}% require single-click approval in the review drawer.
                </p>
              </div>

              {/* Background Cleanup Toggle */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className={`text-xs font-bold ${headingText} block`}>AI Background Segmentation</span>
                  <span className={`text-[10px] ${subtleText} block`}>
                    Isolates packshots using u2netp segmentation onto pure white #FFFFFF canvas.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={cleanBg}
                  onChange={(e) => setCleanBg(e.target.checked)}
                  className="w-4 h-4 accent-[#FF5B00] rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center">
              {geminiApiKey ? (
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Key</span>
                </button>
              ) : <div />}

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    darkMode ? "border-zinc-700 hover:bg-zinc-800 text-zinc-300" : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveKey}
                  className="bg-[#FF5B00] hover:bg-[#E04E00] text-white px-5 py-2 rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center space-x-1.5 active:scale-95 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
