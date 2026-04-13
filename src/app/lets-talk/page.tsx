"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, CheckCircle2, ChevronDown } from "lucide-react";
import Link from "next/link";

type ConsultationFormState = {
  // Section 1
  name: string;
  email: string;
  company: string;
  role: string;
  
  // Section 2
  businessType: string;
  companySize: string;
  volume: string;

  // Section 3
  automationGoal: string;
  toolsUsed: string[];
  bottleneck: string;

  // Section 4
  usedAutomation: boolean | null;
  previousTools: string;
  complexity: string;

  // Section 5
  urgency: string;
  budget: string;

  // Section 6
  additionalInfo: string;
};

const initialFormState: ConsultationFormState = {
  name: "",
  email: "",
  company: "",
  role: "",
  businessType: "",
  companySize: "",
  volume: "",
  automationGoal: "",
  toolsUsed: [],
  bottleneck: "",
  usedAutomation: null,
  previousTools: "",
  complexity: "",
  urgency: "",
  budget: "",
  additionalInfo: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LetsTalkPage() {
  const [form, setForm] = useState<ConsultationFormState>(initialFormState);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Update field
  const updateForm = (field: keyof ConsultationFormState, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Toggle multi-select
  const toggleTool = (tool: string) => {
    setForm(prev => {
      const exists = prev.toolsUsed.includes(tool);
      return {
        ...prev,
        toolsUsed: exists 
          ? prev.toolsUsed.filter(t => t !== tool)
          : [...prev.toolsUsed, tool]
      };
    });
  };

  // Validation per step
  const canProceed = () => {
    switch (step) {
      case 1:
        return form.name.trim().length >= 2 && EMAIL_REGEX.test(form.email) && form.company.trim().length > 0 && form.role !== "";
      case 2:
        return form.businessType.trim().length > 5 && form.companySize !== "" && form.volume.trim().length > 0;
      case 3:
        return form.automationGoal.trim().length > 5 && form.bottleneck.trim().length > 5;
      case 4:
        return form.usedAutomation !== null && (form.usedAutomation === false || form.previousTools.trim().length > 0) && form.complexity !== "";
      case 5:
        return form.urgency !== "" && form.budget !== "";
      case 6:
        return true; // optional
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 6 && canProceed()) {
      setDirection(1);
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setDirection(-1);
      setStep(s => s - 1);
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;
    setLoading(true);
    
    // Simulate network request
    await new Promise(r => setTimeout(r, 1500));
    
    try {
      // In a real app, this would be a real API call.
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } catch (e) {
      // Ignore for demo purposes, assume success
    }

    setLoading(false);
    setSubmitted(true);
  };

  // Variants for sliding animation
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0
    })
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-[#111] border border-white/10 rounded-[24px] p-10 text-center shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent" />
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 mb-8 border border-accent/20">
            <CheckCircle2 className="h-10 w-10 text-accent" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-4">Request Received</h2>
          <p className="text-white/60 leading-relaxed mb-8">
            Thanks! We'll review your requirements and get back to you soon.
          </p>
          <Link href="/" className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-all">
            Return to Homepage
          </Link>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] pt-24 pb-20 font-sans flex flex-col items-center">
      {/* Page Header */}
      <div className="text-center mb-12 px-6">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
          Let's build something <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-400">powerful.</span>
        </h1>
        <p className="text-white/50 text-[17px] font-medium max-w-lg mx-auto">
          Share your process. We will design the perfect custom automation architecture for your business.
        </p>
      </div>

      {/* Main Form Container */}
      <div className="w-full max-w-2xl px-6 relative">
        <div className="bg-[#0c0c0c] border border-white/10 rounded-[28px] shadow-2xl relative">
          
          {/* Progress Bar */}
          <div className="h-1.5 w-full bg-white/5 rounded-t-[28px] overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-accent to-blue-400"
              initial={{ width: "0%" }}
              animate={{ width: `${(step / 6) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>

          <div className="p-8 md:p-12 min-h-[440px] flex flex-col relative">
            <div className="flex justify-between items-center mb-8">
              <span className="text-accent text-sm font-bold tracking-widest uppercase">
                Step {step} of 6
              </span>
              <span className="text-white/30 text-sm font-medium">
                {step === 1 && "Basic Info"}
                {step === 2 && "Business Context"}
                {step === 3 && "Automation Need"}
                {step === 4 && "Tech & Complexity"}
                {step === 5 && "Priority & Budget"}
                {step === 6 && "Final Details"}
              </span>
            </div>

            <div className="flex-1 relative">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
                  className="w-full absolute inset-0"
                >
                  
                  {/* STEP 1: Basic Info */}
                  {step === 1 && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[13px] font-semibold text-white/70 mb-2 uppercase tracking-wide">Full Name</label>
                          <input type="text" value={form.name} onChange={e => updateForm("name", e.target.value)} autoFocus
                            className="w-full bg-[#151515] border border-white/10 focus:border-accent/50 rounded-xl px-4 py-3.5 text-white outline-none transition-colors" placeholder="Jane Doe" />
                        </div>
                        <div>
                          <label className="block text-[13px] font-semibold text-white/70 mb-2 uppercase tracking-wide">Work Email</label>
                          <input type="email" value={form.email} onChange={e => updateForm("email", e.target.value)}
                            className="w-full bg-[#151515] border border-white/10 focus:border-accent/50 rounded-xl px-4 py-3.5 text-white outline-none transition-colors" placeholder="jane@company.com" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-white/70 mb-2 uppercase tracking-wide">Company Name</label>
                        <input type="text" value={form.company} onChange={e => updateForm("company", e.target.value)}
                          className="w-full bg-[#151515] border border-white/10 focus:border-accent/50 rounded-xl px-4 py-3.5 text-white outline-none transition-colors" placeholder="Acme Corp" />
                      </div>
                      <div className="relative z-[100]">
                        <label className="block text-[14px] font-bold text-white/80 mb-3 uppercase tracking-wider">Role / Position</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                            onBlur={() => setTimeout(() => setIsRoleDropdownOpen(false), 200)}
                            className={`w-full flex items-center justify-between bg-[#151515] border focus:border-accent/60 rounded-2xl px-5 py-4 text-left transition-all duration-200 ${isRoleDropdownOpen ? "border-accent ring-2 ring-accent/20 shadow-[0_0_20px_rgba(79,142,247,0.15)]" : "border-white/10 hover:border-white/25"}`}
                          >
                            <span className={form.role ? "text-white text-[16px] font-medium" : "text-white/40 text-[16px]"}>
                              {form.role || "Choose your role..."}
                            </span>
                            <ChevronDown className={`h-6 w-6 text-white/40 transition-transform duration-300 ${isRoleDropdownOpen ? "rotate-180 text-accent" : ""}`} />
                          </button>
                          
                          <AnimatePresence>
                            {isRoleDropdownOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#1c1c1c] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden z-[110] border-t-white/5"
                              >
                                {["Founder", "Manager", "Developer", "Other"].map(role => (
                                  <button
                                    key={role}
                                    type="button"
                                    onMouseDown={(e) => {
                                      // Using onMouseDown to trigger before onBlur
                                      e.preventDefault();
                                      updateForm("role", role);
                                      setIsRoleDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-6 py-4.5 text-[16px] font-semibold transition-all hover:bg-white/5 flex items-center justify-between group ${form.role === role ? "text-accent bg-accent/10" : "text-white/80 hover:text-white"}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-1.5 h-1.5 rounded-full transition-all ${form.role === role ? "bg-accent scale-125" : "bg-white/20 group-hover:bg-white/40"}`} />
                                      {role}
                                    </div>
                                    {form.role === role && <CheckCircle2 className="h-5 w-5 text-accent animate-in zoom-in duration-300" />}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Business Context */}
                  {step === 2 && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[13px] font-semibold text-white/70 mb-2 uppercase tracking-wide">What does your business do?</label>
                        <textarea value={form.businessType} onChange={e => updateForm("businessType", e.target.value)} rows={3} autoFocus
                          className="w-full bg-[#151515] border border-white/10 focus:border-accent/50 rounded-xl px-4 py-3.5 text-white outline-none transition-colors resize-none" placeholder="We are a marketing agency that helps ecommerce brands scale..." />
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-white/70 mb-2 uppercase tracking-wide">Approx company size</label>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          {["1-5", "5-20", "20-100", "100+"].map(size => (
                            <button key={size} onClick={() => updateForm("companySize", size)}
                              className={`py-3 rounded-xl border text-sm font-medium transition-colors ${form.companySize === size ? "bg-accent/10 border-accent text-accent" : "bg-[#151515] border-white/10 text-white/70 hover:border-white/30"}`}>
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-white/70 mb-2 uppercase tracking-wide">Monthly leads or operations volume</label>
                        <input type="text" value={form.volume} onChange={e => updateForm("volume", e.target.value)}
                          className="w-full bg-[#151515] border border-white/10 focus:border-accent/50 rounded-xl px-4 py-3.5 text-white outline-none transition-colors" placeholder="e.g. 500 leads/mo or 200 orders/day" />
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Automation Need */}
                  {step === 3 && (
                    <div className="space-y-6 h-full flex flex-col justify-center">
                      <div>
                        <label className="block text-[13px] font-semibold text-white/70 mb-2 uppercase tracking-wide">What do you want to automate?</label>
                        <textarea value={form.automationGoal} onChange={e => updateForm("automationGoal", e.target.value)} rows={3} autoFocus
                          className="w-full bg-[#151515] border border-white/10 focus:border-accent/50 rounded-xl px-4 py-3.5 text-white outline-none transition-colors resize-none mb-1" placeholder="Describe the workflow or manual task you hate doing..." />
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-white/70 mb-3 uppercase tracking-wide">Which tools do you currently use?</label>
                        <div className="flex flex-wrap gap-2">
                          {["WhatsApp", "Email", "Google Sheets", "CRM", "Zapier", "Other"].map(tool => {
                            const isSelected = form.toolsUsed.includes(tool);
                            return (
                              <button key={tool} onClick={() => toggleTool(tool)}
                                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${isSelected ? "bg-accent text-white border-accent shadow-[0_0_15px_rgba(79,142,247,0.3)]" : "bg-[#151515] border-white/10 text-white/70 hover:border-white/30 hover:bg-white/5"}`}>
                                {tool}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="pt-2">
                        <label className="block text-[13px] font-semibold text-white/70 mb-2 uppercase tracking-wide">What is your biggest bottleneck right now?</label>
                        <input type="text" value={form.bottleneck} onChange={e => updateForm("bottleneck", e.target.value)}
                          className="w-full bg-[#151515] border border-white/10 focus:border-accent/50 rounded-xl px-4 py-3.5 text-white outline-none transition-colors" placeholder="e.g. Data entry, slow lead response times..." />
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Tech & Complexity */}
                  {step === 4 && (
                    <div className="space-y-8">
                      <div>
                        <label className="block text-[13px] font-semibold text-white/70 mb-4 uppercase tracking-wide">Have you used automation tools before?</label>
                        <div className="flex gap-4">
                           <button onClick={() => updateForm("usedAutomation", true)}
                              className={`flex-1 py-3.5 rounded-xl border font-semibold transition-all ${form.usedAutomation === true ? "bg-accent/10 border-accent text-accent" : "bg-[#151515] border-white/10 text-white/70 hover:border-white/30"}`}>
                              Yes
                           </button>
                           <button onClick={() => { updateForm("usedAutomation", false); updateForm("previousTools", ""); }}
                              className={`flex-1 py-3.5 rounded-xl border font-semibold transition-all ${form.usedAutomation === false ? "bg-accent/10 border-accent text-accent" : "bg-[#151515] border-white/10 text-white/70 hover:border-white/30"}`}>
                              No
                           </button>
                        </div>
                        
                        <AnimatePresence>
                          {form.usedAutomation === true && (
                            <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: "auto", marginTop: 16 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="overflow-hidden">
                              <input type="text" value={form.previousTools} onChange={e => updateForm("previousTools", e.target.value)} autoFocus
                                className="w-full bg-[#151515] border border-white/10 focus:border-accent/50 rounded-xl px-4 py-3.5 text-white outline-none transition-colors" placeholder="Which tools? (e.g. Make, Zapier, n8n)" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div>
                        <label className="block text-[13px] font-semibold text-white/70 mb-4 uppercase tracking-wide">How complex do you expect your automation to be?</label>
                        <div className="space-y-3">
                          {[
                            { id: "Simple", desc: "1-2 steps (e.g. Form to Email)" },
                            { id: "Medium", desc: "Multi-step (e.g. CRM to Sheets to Slack)" },
                            { id: "Complex", desc: "Advanced workflows with AI & custom logic" }
                          ].map(com => (
                             <button key={com.id} onClick={() => updateForm("complexity", com.id)}
                               className={`w-full text-left p-4 rounded-xl border transition-all ${form.complexity === com.id ? "bg-accent/10 border-accent" : "bg-[#151515] border-white/10 hover:border-white/30"}`}>
                               <div className={`font-bold ${form.complexity === com.id ? "text-accent" : "text-white"}`}>{com.id}</div>
                               <div className={`text-sm mt-1 ${form.complexity === com.id ? "text-accent/80" : "text-white/50"}`}>{com.desc}</div>
                             </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 5: Priority & Budget */}
                  {step === 5 && (
                    <div className="space-y-8">
                      <div>
                        <label className="block text-[13px] font-semibold text-white/70 mb-4 uppercase tracking-wide">How urgent is this project?</label>
                        <div className="flex flex-col sm:flex-row gap-3">
                          {["Just exploring", "Within 1 month", "ASAP"].map(urg => (
                            <button key={urg} onClick={() => updateForm("urgency", urg)}
                              className={`flex-1 py-3.5 rounded-xl border text-sm font-semibold transition-all ${form.urgency === urg ? "bg-accent/10 border-accent text-accent" : "bg-[#151515] border-white/10 text-white/70 hover:border-white/30"}`}>
                              {urg}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[13px] font-semibold text-white/70 mb-4 uppercase tracking-wide">Estimated budget range</label>
                        <div className="grid grid-cols-2 gap-3">
                          {["Under ₹10k", "₹10k–₹50k", "₹50k–₹2L", "₹2L+"].map(bud => (
                             <button key={bud} onClick={() => updateForm("budget", bud)}
                               className={`py-4 rounded-xl border text-[15px] font-bold transition-all ${form.budget === bud ? "bg-accent/10 border-accent text-accent" : "bg-[#151515] border-white/10 text-white/70 hover:border-white/30"}`}>
                               {bud}
                             </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 6: Final Details */}
                  {step === 6 && (
                    <div className="space-y-6 h-full flex flex-col justify-center">
                      <div className="text-center mb-4">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 mb-6">
                           <span className="text-3xl">👋</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Almost done!</h2>
                        <p className="text-white/50 text-[15px]">Any final thoughts before we get started?</p>
                      </div>
                      
                      <div>
                        <label className="block text-[13px] font-semibold text-white/70 mb-2 uppercase tracking-wide">Anything else we should know? <span className="opacity-50 lowercase normal-case ml-2">(Optional)</span></label>
                        <textarea value={form.additionalInfo} onChange={e => updateForm("additionalInfo", e.target.value)} rows={4} autoFocus
                          className="w-full bg-[#151515] border border-white/10 focus:border-accent/50 rounded-xl px-4 py-3.5 text-white outline-none transition-colors resize-none" placeholder="We are specifically looking for someone who understands our industry..." />
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* Navigation Buttons */}
            <div className="mt-auto pt-8 border-t border-white/10 flex items-center justify-between pb-2">
              <button 
                type="button"
                onClick={handleBack}
                className={`flex items-center gap-2 h-12 px-6 rounded-xl text-white/40 hover:text-white font-bold transition-all ${step === 1 ? "invisible" : "visible"}`}
              >
                <ArrowLeft className="h-5 w-5" /> Back
              </button>
              
              {step < 6 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className={`flex items-center gap-3 h-14 px-10 rounded-2xl font-bold transition-all duration-300 ${
                    canProceed() 
                    ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:scale-105 hover:bg-gray-100" 
                    : "bg-white/10 text-white/30 cursor-not-allowed border border-white/5"
                  }`}
                >
                  Continue <ArrowRight className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-3 h-14 px-10 rounded-2xl bg-accent hover:bg-accent/90 text-white font-bold transition-all shadow-[0_0_40px_rgba(79,142,247,0.3)] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="h-6 w-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Request Consultation"
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
