import React, { useState, useEffect, useRef } from "react";
import { 
  Camera, 
  Upload, 
  ShoppingBag, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Plus, 
  Filter, 
  Check, 
  Trash2, 
  Volume2, 
  VolumeX, 
  ArrowLeft, 
  ChevronRight, 
  Clock, 
  Flame, 
  Loader2, 
  Maximize2,
  CalendarDays,
  UtensilsCrossed,
  RotateCcw,
  PlusCircle,
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PRESET_FRIDGES, PresetFridge } from "./data";
import { Ingredient, Recipe, ShoppingItem, RecipeStep } from "./types";

export default function App() {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<"scan" | "shopping">("scan");
  
  // Custom Filters & Inputs
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<string[]>([]);
  const [activePreset, setActivePreset] = useState<string>("veggie");
  const [manualIngredientsInput, setManualIngredientsInput] = useState<string>("");
  const [customImage, setCustomImage] = useState<string | null>(null);
  
  // Scanned Results State
  const [identifiedIngredients, setIdentifiedIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanSource, setScanSource] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active cooking state (Hands-free mode)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Loading tip cycle
  const [loadingTipIndex, setLoadingTipIndex] = useState<number>(0);

  // Shopping List state (persisted in localStorage)
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Loading Screen Tips array
  const LOADING_TIPS = [
    "Gemini is analyzing food textures & containers...",
    "Correlating protein variables with dietary filters...",
    "Scanning nutrient indices & estimated prep-times...",
    "Generating optimal hand-crafted step-by-step guides...",
    "Synthesizing ingredient variations in cookery formulas..."
  ];

  // Initialize Speech Synthesis and Load shopping list
  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
      const savedItems = localStorage.getItem("assistant_shopping_list");
      if (savedItems) {
        try {
          setShoppingList(JSON.parse(savedItems));
        } catch (e) {
          console.error("Error reading shopping list", e);
        }
      }
    }
  }, []);

  // Save shopping list to local storage
  const saveShoppingList = (updated: ShoppingItem[]) => {
    setShoppingList(updated);
    localStorage.setItem("assistant_shopping_list", JSON.stringify(updated));
  };

  // Switch loading screen tips
  useEffect(() => {
    let interval: any;
    if (isScanning) {
      interval = setInterval(() => {
        setLoadingTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  // Handle Speech cleanup on unmount
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Show quick status toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Toggle dietary restrictions Filter
  const toggleDietaryTag = (tag: string) => {
    if (selectedDietaryTags.includes(tag)) {
      setSelectedDietaryTags(selectedDietaryTags.filter((t) => t !== tag));
    } else {
      setSelectedDietaryTags([...selectedDietaryTags, tag]);
    }
  };

  // Standard dietary tag lists
  const DIETARY_OPTIONS = ["Vegetarian", "Keto", "Gluten-Free", "Vegan", "Dairy-Free"];

  // File Upload Handlers (FileReader base64)
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      triggerToast("Please present a valid image file of your fridge.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCustomImage(reader.result as string);
      setActivePreset(""); // blank preset when custom image uploaded
      triggerToast("Custom fridge photo successfully registered!");
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageFile(e.target.files[0]);
    }
  };

  // Perform backend analysis call
  const handleScanFridge = async () => {
    setIsScanning(true);
    try {
      const response = await fetch("/api/recipe-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: customImage,
          selectedPreset: activePreset,
          dietaryFilters: selectedDietaryTags,
          manualIngredients: manualIngredientsInput
        })
      });

      const data = await response.json();
      
      if (data) {
        setIdentifiedIngredients(data.ingredients || []);
        // Sort recipes by diet overlap or just store
        setRecipes(data.recipes || []);
        setScanSource(data.source || "gemini-ai");
        triggerToast(`Fridge scanned successfully via ${data.source === 'gemini-ai' ? 'Gemini AI' : 'Local system'}!`);
      }
    } catch (err) {
      console.error("Scan API Error:", err);
      triggerToast("An error occurred during scanning. Fallback data presented.");
    } finally {
      setIsScanning(false);
    }
  };

  // Run initial scan on load to populate beautiful state
  useEffect(() => {
    handleScanFridge();
  }, []);

  // Shopping list management
  const addToShoppingList = (ingredientName: string, recipeName?: string) => {
    const isAlrExisting = shoppingList.find(
      (item) => item.name.toLowerCase() === ingredientName.toLowerCase() && !item.bought
    );
    if (isAlrExisting) {
      triggerToast(`"${ingredientName}" is already in your Shopping List.`);
      return;
    }

    const newItem: ShoppingItem = {
      id: "shop_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      name: ingredientName,
      recipeName: recipeName,
      bought: false
    };

    const updated = [newItem, ...shoppingList];
    saveShoppingList(updated);
    triggerToast(`Added "${ingredientName}" to Shopping List!`);
  };

  const toggleShopItem = (id: string) => {
    const updated = shoppingList.map((item) => 
      item.id === id ? { ...item, bought: !item.bought } : item
    );
    saveShoppingList(updated);
  };

  const removeShopItem = (id: string) => {
    const updated = shoppingList.filter((item) => item.id !== id);
    saveShoppingList(updated);
    triggerToast("Item removed.");
  };

  const clearBoughtItems = () => {
    const updated = shoppingList.filter((item) => !item.bought);
    saveShoppingList(updated);
    triggerToast("Cleared checked items.");
  };

  // Sound read aloud functions
  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const speakText = (text: string) => {
    if (!synthRef.current) return;
    
    // Stop previous speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // Find optional crisp voice
    const voices = synthRef.current.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith("en-US")) || voices[0];
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    utteranceRef.current = utterance;
    setIsSpeaking(true);
    synthRef.current.speak(utterance);
  };

  const speakStep = (stepIndex: number) => {
    if (!selectedRecipe) return;
    const step = selectedRecipe.steps[stepIndex];
    if (!step) return;
    
    const phrase = `Step ${step.number}. ${step.text} ${step.tip ? `Chef tip: ${step.tip}` : ""}`;
    speakText(phrase);
  };

  const handleStepPrev = () => {
    if (currentStepIndex > 0) {
      const idx = currentStepIndex - 1;
      setCurrentStepIndex(idx);
      // Auto speak next step
      setTimeout(() => speakStep(idx), 100);
    }
  };

  const handleStepNext = () => {
    if (selectedRecipe && currentStepIndex < selectedRecipe.steps.length - 1) {
      const idx = currentStepIndex + 1;
      setCurrentStepIndex(idx);
      setTimeout(() => speakStep(idx), 100);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
      
      {/* 1. TOP NAV STRIP (Professional Slate/Emerald Strip) */}
      <div className="bg-slate-900 text-slate-300 text-[11px] py-2 px-6 flex justify-between items-center tracking-wider font-mono border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <span className="text-emerald-500 font-bold animate-pulse">●</span>
          <span>CULINARY AI ENGINE</span>
          <span className="text-slate-500">v4.0 Live</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>SECURE SECRETS ACTIVE</span>
          <span className="hidden sm:inline text-emerald-450 text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-900/50 px-2 py-0.5 rounded text-[10px]">
            AUTO-SYNC
          </span>
        </div>
      </div>

      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center font-sans">
          {/* Logo with modern polished typography */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-600/10">
              <UtensilsCrossed size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                Culinary<span className="text-emerald-600">Assistant</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Smart Fridge Suite</p>
            </div>
          </div>

          {/* Navigation Category Components in Pill Style */}
          <nav className="flex space-x-2">
            <button
              onClick={() => { setActiveTab("scan"); if(selectedRecipe) stopSpeaking(); setSelectedRecipe(null); }}
              className={`px-4 py-2 text-xs font-bold tracking-wider rounded-lg transition-all uppercase flex items-center space-x-2 border cursor-pointer select-none ${
                activeTab === "scan"
                  ? "bg-slate-900 text-white border-transparent shadow-sm"
                  : "bg-slate-100 text-slate-650 hover:bg-slate-200 text-slate-705 border-slate-200 text-slate-700"
              }`}
            >
              <UtensilsCrossed size={14} />
              <span className="hidden sm:inline">Fridge Analyzer</span>
              <span className="sm:hidden">Analyzer</span>
            </button>
            <button
              onClick={() => { setActiveTab("shopping"); if(selectedRecipe) stopSpeaking(); setSelectedRecipe(null); }}
              className={`px-4 py-2 text-xs font-bold tracking-wider rounded-lg transition-all uppercase flex items-center space-x-2 relative border cursor-pointer select-none ${
                activeTab === "shopping"
                  ? "bg-slate-900 text-white border-transparent shadow-sm"
                  : "bg-slate-100 text-slate-650 hover:bg-slate-200 text-slate-705 border-slate-200 text-slate-700"
              }`}
            >
              <ShoppingBag size={14} />
              <span className="hidden sm:inline">Shopping List</span>
              <span className="sm:hidden">Shopping</span>
              {shoppingList.filter(i => !i.bought).length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold tracking-normal animate-pulse shadow-sm">
                  {shoppingList.filter(i => !i.bought).length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Hero promo card with Emerald Backdrop Accents */}
      <section className="bg-white border-b border-slate-200 relative overflow-hidden py-8 sm:py-12">
        <div className="absolute top-0 right-0 w-1/3 h-full opacity-[0.02] pointer-events-none">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,100 L50,0 Q60,40 100,20 L100,100 Z" fill="#10b981" />
          </svg>
        </div>

        {/* Polished minimalist backdrop blocks */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden xl:flex space-x-2 opacity-5">
          <div className="w-8 h-64 bg-emerald-600 rounded-3xl transform -skew-x-12"></div>
          <div className="w-8 h-64 bg-emerald-600 rounded-3xl transform -skew-x-12"></div>
        </div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden xl:flex space-x-2 opacity-5">
          <div className="w-8 h-64 bg-emerald-600 rounded-3xl transform -skew-x-12"></div>
          <div className="w-8 h-64 bg-emerald-600 rounded-3xl transform -skew-x-12"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                <Sparkles size={13} className="text-emerald-605 text-emerald-600" />
                <span className="text-[11px] font-bold text-emerald-700 tracking-wider uppercase">Powered by Gemini AI Multimodal</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Turn your open fridge photos into <span className="text-emerald-600">gourmet culinary recipes</span>.
              </h2>
              <p className="text-slate-600 text-sm sm:text-base max-w-xl leading-relaxed">
                Snap or upload a photo of your smart fridge core shelves. Our AI instantly catalogues your proteins, greens, and pantry items to suggest professional calorie-counted instructions.
              </p>
            </div>
            
            <div className="lg:col-span-5 hidden lg:block bg-slate-50 p-5 border border-slate-200 rounded-2xl shadow-xs">
              <div className="bg-white p-4 rounded-xl space-y-3 shadow-xs border border-slate-150">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="text-emerald-600" size={16} />
                  <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">Multimodal Fridge Interpreter</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upload actual kitchen space photography to isolate ingredients, analyze remaining supplies, and drafts dynamic recipes matching restriction settings.
                </p>
                <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg text-[10px] sm:text-xs border border-slate-100">
                  <span className="text-emerald-600 font-bold font-mono">SCAN:</span>
                  <span className="text-slate-600 font-medium">Capture Fridge</span>
                  <ChevronRight size={12} className="text-slate-400" />
                  <span className="text-emerald-600 font-bold font-mono">COOK:</span>
                  <span className="text-slate-600 font-medium">Hands-Free Audio</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Toast Indicator */}
      <AnimatePresence>
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl border-l-4 border-emerald-500 text-xs sm:text-sm flex items-center space-x-3 max-w-sm"
              id="app-toast-alert"
            >
              <div className="bg-emerald-600 p-1.5 rounded-lg">
                <Sparkles size={14} className="text-white" />
              </div>
              <span className="font-semibold">{toastMessage}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. CORE WORKSPACE AREA */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-grow w-full">
        {activeTab === "scan" ? (
          <div className="space-y-8">
            
            {/* Input Config Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Sidebar Filters & Photo Snapper (Left Side, 5 Cols) */}
              <div className="lg:col-span-5 space-y-6 animate-fade-in">
                
                {/* Visual input section container card */}
                <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-xs space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <Camera className="text-emerald-600" size={18} />
                      <h3 className="font-bold text-slate-800 tracking-tight text-sm uppercase">1. Fridge Input Source</h3>
                    </div>
                    {customImage && (
                      <button
                        onClick={() => { setCustomImage(null); setActivePreset("veggie"); triggerToast("Custom photo cleared. Restored defaults."); }}
                        className="text-xs text-red-600 hover:underline font-bold"
                      >
                        Clear Image
                      </button>
                    )}
                  </div>

                  {/* Drag-and-drop Image Uploader */}
                  <div 
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
                      isDragging 
                        ? "border-emerald-600 bg-emerald-50/40" 
                        : customImage 
                          ? "border-emerald-400 bg-emerald-50/10" 
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    {customImage ? (
                      <div className="space-y-3">
                        <div className="relative inline-block">
                          <img 
                            src={customImage} 
                            alt="Your Fridge Scan" 
                            className="max-h-44 mx-auto rounded-lg object-cover shadow-sm border border-slate-200"
                            id="custom-uploaded-fridge-preview"
                          />
                          <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] uppercase font-bold py-1 px-2 rounded-md tracking-wider shadow">
                            READY TO ANALYZE
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          Custom uploaded image ready for structured parsing.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                          <Upload size={22} />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-slate-850 text-slate-700">Drag & drop your fridge photo</p>
                          <p className="text-[10px] sm:text-xs text-slate-400 mt-1">Supports PNG, JPG, or WEBP up to 10MB</p>
                        </div>
                        <label className="inline-block mt-2 bg-white border border-slate-300 px-4 py-2 hover:bg-slate-50 text-[11px] font-bold text-slate-700 rounded-lg cursor-pointer transition-all uppercase tracking-wider shadow-xs">
                          Browse Local Files
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={onFileSelect} 
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Preset testing options box */}
                  <div className="space-y-3 pt-2">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      Or Select Preset Fridge Stock
                    </p>
                    <div className="grid grid-cols-1 gap-2.5">
                      {PRESET_FRIDGES.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            setActivePreset(preset.id);
                            setCustomImage(null); // Clear custom image to prioritize preset
                            triggerToast(`Selected ${preset.name}! Click Scan to run.`);
                          }}
                          className={`w-full text-left p-3 border rounded-xl transition-all cursor-pointer flex items-start space-x-3 ${
                            activePreset === preset.id && !customImage
                              ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-650 ring-emerald-500/20"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <span className="text-2xl mt-0.5">{preset.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-xs text-slate-800">{preset.name}</span>
                              <span className="text-[9px] bg-slate-100 border border-slate-150 py-0.5 px-2 rounded-full font-bold text-slate-500 uppercase tracking-wider">
                                {preset.dietaryRecommendation}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{preset.keywords}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sidebar Filter for Dietary restrictions */}
                <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-xs space-y-4">
                  <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                    <Filter className="text-emerald-600" size={18} />
                    <h3 className="font-bold text-slate-800 tracking-tight text-sm uppercase">2. Dietary Settings</h3>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {DIETARY_OPTIONS.map((tag) => {
                      const isSelected = selectedDietaryTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => toggleDietaryTag(tag)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center space-x-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-bold shadow-xs"
                              : "bg-white border-slate-200 text-slate-650 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                          }`}
                          id={`filter-dietary-${tag.toLowerCase()}`}
                        >
                          {isSelected && <Check size={12} className="stroke-[3]" />}
                          <span>{tag}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">
                      Add manually / Missing items (comma-separated)
                    </label>
                    <input 
                      type="text" 
                      value={manualIngredientsInput}
                      onChange={(e) => setManualIngredientsInput(e.target.value)}
                      placeholder="e.g. Greek yogurt, Fresh parmesan, Cilantro"
                      className="w-full bg-slate-50 border border-slate-250 border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                      id="manual-ingredients-field"
                    />
                  </div>

                  {/* Polished Emerald theme button */}
                  <button
                    onClick={handleScanFridge}
                    disabled={isScanning}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-4 rounded-xl font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/10 cursor-pointer select-none"
                    id="trigger-fridge-scan-button"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="animate-spin text-white" size={16} />
                        <span>Discovering Recipes...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>Scan & Identify Recipes</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

              {/* Scan Results Panel & Recipes (Right Side, 7 Cols) */}
              <div className="lg:col-span-7 space-y-6">

                {/* Loading State Overlay / Card */}
                {isScanning ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-6 flex flex-col items-center justify-center min-h-[460px]">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-slate-100 border-t-emerald-600 rounded-full animate-spin"></div>
                      <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600 animate-pulse" size={22} />
                    </div>
                    <div className="space-y-2 max-w-sm">
                      <h4 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Culinary Synthesis Active</h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        Our assistant is reading through your ingredients to design custom dietitian-aligned meal cards.
                      </p>
                    </div>

                    {/* Fun Chef reassuring advice strip */}
                    <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl w-full max-w-md animate-pulse">
                      <p className="text-[9px] font-mono font-bold text-slate-400 tracking-wider uppercase">VIRTUAL CHEF ADVICE</p>
                      <p className="text-xs font-bold text-slate-700 mt-1">"{LOADING_TIPS[loadingTipIndex]}"</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Ingredients Identified Bar */}
                    <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-xs space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-150 pb-3">
                        <div>
                          <h3 className="font-bold text-slate-800 tracking-tight text-sm uppercase">
                            Catalogued Shelf Stock
                          </h3>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Auto-detected in {customImage ? "user image upload" : `"${PRESET_FRIDGES.find(p => p.id === activePreset)?.name || "Default Preset"}"`}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-md">
                          {identifiedIngredients.length} INVENTORIES DETECTED
                        </span>
                      </div>

                      {identifiedIngredients.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {identifiedIngredients.map((ing, i) => (
                            <div
                              key={i}
                              className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 text-slate-700 font-medium"
                            >
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                              <span>{ing.name}</span>
                              {ing.category && (
                                <span className="text-[9px] bg-slate-250 bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded uppercase font-mono">
                                  {ing.category}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic pb-2">
                          No ingredients available yet. Select a preset or upload your camera scan above!
                        </p>
                      )}
                    </div>

                    {/* Scrollable Recipe Cards List */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-extrabold text-slate-800 tracking-tight text-sm uppercase">
                          Recipe Cards Recommendations
                        </h3>
                        {recipes.length > 0 && (
                          <p className="text-xs text-slate-500 font-bold">
                            {recipes.length} customized meal choices
                          </p>
                        )}
                      </div>

                      {recipes.length > 0 ? (
                        <div className="space-y-4" id="suggested-recipes-container">
                          {recipes.map((recipe) => (
                            <div
                              key={recipe.id}
                              className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl overflow-hidden shadow-xs hover:shadow-sm transition-all duration-200 flex flex-col md:flex-row"
                            >
                              {/* Left recipe color block with food emblem */}
                              <div className="md:w-36 bg-slate-900 p-4 flex flex-col items-center justify-center text-center text-white relative">
                                <div className="absolute top-3 left-3 flex space-x-0.5">
                                  <div className="w-1 h-3.5 bg-emerald-500 transform -skew-x-12"></div>
                                  <div className="w-1 h-3.5 bg-emerald-500 transform -skew-x-12"></div>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-emerald-100/10 border border-emerald-500/20 flex items-center justify-center text-2xl mb-2">
                                  {recipe.dietaryTags.includes("Keto") ? "🥩" : recipe.dietaryTags.includes("Vegetarian") ? "🥑" : "🍝"}
                                </div>
                                <span className="text-[10px] font-bold bg-emerald-600 text-white px-2.5 py-1 rounded-md tracking-wider uppercase">
                                  {recipe.prepTime}
                                </span>
                              </div>

                              {/* Main recipe description of standard soft card product format */}
                              <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h4 className="font-extrabold text-slate-800 text-base sm:text-lg hover:text-emerald-600 transition-colors">
                                      {recipe.name}
                                    </h4>
                                    <div className="flex space-x-1.5 text-xs">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono uppercase border ${
                                        recipe.difficulty === "Easy" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                                        recipe.difficulty === "Medium" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-red-5 border-red-200 border-red-100 bg-red-50 text-red-750 text-red-700"
                                      }`}>
                                        {recipe.difficulty}
                                      </span>
                                      <span className="bg-slate-100 border border-slate-200 text-slate-705 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono">
                                        {recipe.calories} CAL
                                      </span>
                                    </div>
                                  </div>

                                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                    {recipe.description}
                                  </p>

                                  {/* Culinary Ingredient overlap listing */}
                                  <div className="pt-2.5 border-t border-slate-100">
                                    <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">
                                      Ingredients Checklist
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {recipe.ingredients.map((ing, k) => (
                                        <div
                                          key={k}
                                          className={`text-[10px] px-2.5 py-1 rounded-lg inline-flex items-center space-x-1 border font-semibold ${
                                            ing.isAvailable
                                              ? "bg-emerald-50/50 border-emerald-200 text-emerald-800"
                                              : "bg-amber-50/50 border-amber-200 text-amber-900 relative group"
                                          }`}
                                        >
                                          {ing.isAvailable ? (
                                            <Check size={8} className="stroke-[3]" />
                                          ) : (
                                            <span className="text-amber-500 font-bold font-mono mr-0.5">!</span>
                                          )}
                                          <span>{ing.name} ({ing.amount})</span>
                                          
                                          {/* Add missing to shopping link in one click */}
                                          {!ing.isAvailable && (
                                            <button
                                              onClick={() => addToShoppingList(ing.name, recipe.name)}
                                              title={`Add missing ${ing.name} to Shopping List`}
                                              className="ml-1 pl-1 border-l border-amber-300 text-emerald-600 hover:text-emerald-800 font-bold cursor-pointer hover:underline focus:outline-none"
                                            >
                                              + Add
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                                  <div className="flex space-x-1">
                                    {recipe.dietaryTags.map((dt) => (
                                      <span key={dt} className="bg-slate-50 border border-slate-200 text-slate-500 px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider">
                                        {dt}
                                      </span>
                                    ))}
                                  </div>

                                  {/* Launch Hands-Free Step-by-Step Mode */}
                                  <button
                                    onClick={() => {
                                      setSelectedRecipe(recipe);
                                      setCurrentStepIndex(0);
                                      // Start speaking automatically!
                                      setTimeout(() => speakStep(0), 400);
                                    }}
                                    className="bg-white border border-slate-900 text-slate-900 hover:bg-slate-50 font-bold px-4 py-2 rounded-lg text-xs tracking-wider uppercase transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs active:scale-95"
                                  >
                                    <span>Start Cooking</span>
                                    <ArrowRight size={13} className="stroke-[2.5]" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center shadow-xs">
                          <p className="text-xs sm:text-sm text-slate-500 font-medium">We couldn't generate recipes or parse inputs.</p>
                          <button
                            onClick={handleScanFridge}
                            className="mt-3 inline-flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 font-bold rounded-lg text-xs uppercase hover:bg-emerald-700 tracking-wider shadow-sm cursor-pointer select-none"
                          >
                            <RotateCcw size={14} />
                            <span>Retry Scanning</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}

              </div>

            </div>

          </div>
        ) : (
          /* 3. SHOPPING LIST TAB PANEL */
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 max-w-2xl mx-auto space-y-6">
            <div className="flex justify-between items-center border-b border-slate-150 pb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-605 text-emerald-600">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight uppercase">Grocery Shopping List</h3>
                  <p className="text-xs text-slate-400 font-medium">Collect materials missing from your kitchen cabinet shelves</p>
                </div>
              </div>

              {shoppingList.length > 0 && (
                <button
                  onClick={clearBoughtItems}
                  className="text-[11px] text-slate-400 hover:text-red-500 font-bold tracking-wider uppercase flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Clear Bought</span>
                </button>
              )}
            </div>

            {/* Manual item adder */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const input = form.elements.namedItem("newItem") as HTMLInputElement;
                if (input && input.value.trim()) {
                  addToShoppingList(input.value.trim(), "Custom Wishlist Item");
                  input.value = "";
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                name="newItem"
                placeholder="Add grocery item manually..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 transition-all"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 hover:bg-emerald-750 text-xs font-bold uppercase rounded-lg tracking-widest flex items-center space-x-1 cursor-pointer shadow-xs"
              >
                <Plus size={14} />
                <span>Add Item</span>
              </button>
            </form>

            {shoppingList.length > 0 ? (
              <div className="divide-y divide-slate-100 border border-slate-250 border-slate-200 rounded-xl overflow-hidden bg-slate-50/20">
                {shoppingList.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-3.5 bg-white hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleShopItem(item.id)}
                        className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center cursor-pointer ${
                          item.bought
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-slate-300 hover:border-emerald-500 bg-white"
                        }`}
                      >
                        {item.bought && <Check size={12} className="stroke-[3]" />}
                      </button>
                      <div>
                        <span className={`text-xs font-bold ${item.bought ? "line-through text-slate-400 font-normal" : "text-slate-800"}`}>
                          {item.name}
                        </span>
                        {item.recipeName && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Recipe: {item.recipeName}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => removeShopItem(item.id)}
                      className="text-slate-350 hover:text-red-600 p-1 rounded-lg cursor-pointer transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/10">
                <ShoppingBag className="mx-auto text-slate-300" size={32} />
                <p className="text-xs font-medium">Your shopping list is currently clear.</p>
                <p className="text-[11px] text-slate-400 font-medium">
                  Missing ingredients from recipe checklist matches can be catalogued here in one-click.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 4. IMMERSIVE STEP-BY-STEP PANELS OVERLAY */}
      <AnimatePresence>
        {selectedRecipe && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/95 overflow-y-auto flex items-center justify-center p-4 sm:p-6"
            id="cooking-mode-overlay"
          >
            <motion.div
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 30 }}
              className="bg-slate-900 text-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col min-h-[480px] max-h-[90vh] border border-slate-800"
            >
              {/* Header inside cooking mode */}
              <div className="bg-slate-950 text-white p-5 flex justify-between items-center border-b border-slate-850">
                <div className="flex items-center space-x-3 font-sans">
                  <div className="flex space-x-0.5">
                    <div className="w-1.5 h-5 bg-emerald-500 rounded transform -skew-x-12"></div>
                    <div className="w-1.5 h-5 bg-emerald-500 rounded transform -skew-x-12"></div>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 tracking-widest font-mono block uppercase">HANDS-FREE STEP-BY-STEP MODE</span>
                    <h3 className="font-extrabold text-white text-sm tracking-wide">{selectedRecipe.name}</h3>
                  </div>
                </div>

                <button
                  onClick={() => { stopSpeaking(); setSelectedRecipe(null); }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-100 px-4 py-2 hover:bg-red-950/20 hover:text-red-400 hover:border-red-900 border border-slate-700 rounded-xl text-xs font-bold tracking-wider uppercase transition-all cursor-pointer"
                  id="close-cooking-assistant-button"
                >
                  Exit Mode
                </button>
              </div>

              {/* Progress Bar indicator */}
              <div className="w-full bg-slate-800 h-1.5">
                <div 
                  className="bg-emerald-500 h-1.5 transition-all duration-300" 
                  style={{ width: `${((currentStepIndex + 1) / selectedRecipe.steps.length) * 100}%` }}
                ></div>
              </div>

              {/* Step Display Area with massive high contrast typography */}
              <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between space-y-6 overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-emerald-400 font-extrabold text-sm md:text-base bg-emerald-950/60 border border-emerald-900/50 px-3 py-1 rounded-lg">
                      INSTRUCTION {selectedRecipe.steps[currentStepIndex]?.number} OF {selectedRecipe.steps.length}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md">
                      Large Font Enabled
                    </span>
                  </div>

                  {/* Gigantic instruction copy */}
                  <div className="space-y-4">
                    <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-relaxed max-w-2xl">
                      {selectedRecipe.steps[currentStepIndex]?.text}
                    </p>

                    {/* Highly highlighted tip block */}
                    {selectedRecipe.steps[currentStepIndex]?.tip && (
                      <div className="bg-slate-950 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4 max-w-2xl">
                        <span className="text-[9px] font-mono font-bold text-amber-500 uppercase tracking-wider block mb-1">
                          Chef's Culinary Secret
                        </span>
                        <p className="text-xs sm:text-sm text-slate-300 font-medium italic">
                          {selectedRecipe.steps[currentStepIndex].tip}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Voice Control Hub Card - Full-width slate badge */}
                <div className="bg-slate-950 rounded-2xl p-4 sm:p-5 border border-slate-850 flex flex-wrap md:flex-nowrap items-center justify-between gap-4 font-sans">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => {
                        if (isSpeaking) {
                          stopSpeaking();
                        } else {
                          speakStep(currentStepIndex);
                        }
                      }}
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 cursor-pointer ${
                        isSpeaking ? "bg-red-600 text-white hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/10"
                      }`}
                      title={isSpeaking ? "Mute Voice Read-Aloud" : "Synthesize Voice Assist"}
                    >
                      {isSpeaking ? <VolumeX size={24} /> : <Volume2 size={24} className="animate-pulse" />}
                    </button>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        {isSpeaking ? "Speaking Audio Active..." : "Synthesize Voice Assist (Hands-Free)"}
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        Read current culinary prep steps clearly and recipes tips out loud with zero touch or screen smear.
                      </p>
                    </div>
                  </div>

                  {/* Navigation step commands built-in */}
                  <div className="flex space-x-2 w-full md:w-auto">
                    <button
                      onClick={handleStepPrev}
                      disabled={currentStepIndex === 0}
                      className="flex-1 md:flex-initial bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-250 text-slate-300 px-4 py-2.5 font-bold text-xs uppercase rounded-xl transition-all disabled:opacity-40 cursor-pointer text-center select-none"
                    >
                      PREVIOUS
                    </button>
                    
                    {currentStepIndex < selectedRecipe.steps.length - 1 ? (
                      <button
                        onClick={handleStepNext}
                        className="flex-1 md:flex-initial bg-white text-slate-900 border border-transparent hover:bg-slate-100 px-5 py-2.5 font-extrabold text-xs uppercase rounded-xl transition-all cursor-pointer text-center select-none shadow-xs"
                      >
                        NEXT STEP
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          stopSpeaking();
                          setSelectedRecipe(null);
                          triggerToast("Chef's compliments! Hope you enjoy your masterpiece!");
                        }}
                        className="flex-1 md:flex-initial bg-emerald-600 text-white px-5 py-2.5 hover:bg-emerald-500 font-extrabold text-xs uppercase rounded-xl transition-all tracking-wider cursor-pointer text-center select-none shadow-sm shadow-emerald-600/10"
                      >
                        FINISH COOKING!
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* Step checklist preview strip at the bottom */}
              <div className="bg-slate-950 px-6 py-4 flex justify-between items-center border-t border-slate-850">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Quick Step Map:</span>
                <div className="flex space-x-2">
                  {selectedRecipe.steps.map((step, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentStepIndex(idx);
                        // speak selected step
                        setTimeout(() => speakStep(idx), 100);
                      }}
                      className={`w-7 h-7 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        idx === currentStepIndex
                          ? "bg-emerald-500 text-white ring-2 ring-emerald-300 shadow-sm"
                          : idx < currentStepIndex
                            ? "bg-emerald-950 border border-emerald-800 text-emerald-400"
                            : "bg-slate-800 border border-slate-700 text-slate-450 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      {step.number}
                    </button>
                  ))}
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. FOOTER SLAB IN DEEP SLATE BLACK */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-white">
                <div className="w-1 h-4.5 bg-emerald-500 rounded transform -skew-x-12"></div>
                <div className="w-1 h-4.5 bg-emerald-500 rounded transform -skew-x-12"></div>
                <span className="font-extrabold uppercase text-xs tracking-wider">Culinary Assistant</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Streamlining kitchen inventory and culinary instructions with advanced state-of-the-art vision extraction and localized read-aloud modules.
              </p>
            </div>

            <div>
              <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">Kitchen Presets</h5>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><button onClick={() => { setActiveTab("scan"); setActivePreset("veggie"); setCustomImage(null); }} className="hover:text-emerald-400 transition-colors cursor-pointer text-left">Green Harvest Fridge</button></li>
                <li><button onClick={() => { setActiveTab("scan"); setActivePreset("meat"); setCustomImage(null); }} className="hover:text-emerald-400 transition-colors cursor-pointer text-left">Fisherman's Wharf Fridge</button></li>
                <li><button onClick={() => { setActiveTab("scan"); setActivePreset("pantry"); setCustomImage(null); }} className="hover:text-emerald-400 transition-colors cursor-pointer text-left">Pantry Essentials Stock</button></li>
              </ul>
            </div>

            <div>
              <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">Dietary Profiles</h5>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>Keto Diet Plan</li>
                <li>Vegetarian / Plant-based</li>
                <li>Gluten-Free Recipes</li>
                <li>Low-Calorie Calculations</li>
              </ul>
            </div>

            <div>
              <h5 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-3">Assistive Modes</h5>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                Large font contrast + synthesized Speech is fully optimized for touch screen tablets placed in sticky cooking environments.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 font-mono">
            <p>© 2026 Home Culinary Intelligent Studio. All rights reserved.</p>
            <div className="flex space-x-4 mt-4 sm:mt-0">
              <button 
                onClick={() => {
                  triggerToast("Our code strictly runs on Cloud Run, securing keys securely in server context.");
                }} 
                className="hover:text-emerald-400 transition-colors cursor-pointer"
              >
                Security Policy
              </button>
              <span>|</span>
              <span>Port 3000 Ingress</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
