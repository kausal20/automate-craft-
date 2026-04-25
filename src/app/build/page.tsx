"use client";

import { useState, useEffect, useReducer, useRef } from "react";
import { Moon, Sun, Play, Pause, Share, MoreVertical, Edit3 } from "lucide-react";
import { AutomationSidebar } from "@/components/build/AutomationSidebar";
import { ChatThread } from "@/components/build/ChatThread";
import { InputComposer } from "@/components/build/InputComposer";
import { AutomationPreview } from "@/components/build/AutomationPreview";
import { AutomationSession, AutomationMessage, AutomationBlueprint } from "@/types/automation";

// --- State Management ---
type State = {
  sessions: AutomationSession[];
  activeSessionId: string | null;
};

type Action =
  | { type: "LOAD_SESSIONS"; payload: AutomationSession[] }
  | { type: "CREATE_SESSION"; payload: AutomationSession }
  | { type: "SET_ACTIVE"; payload: string }
  | { type: "UPDATE_TITLE"; payload: { id: string; title: string } }
  | { type: "ADD_MESSAGE"; payload: { sessionId: string; message: AutomationMessage } }
  | { type: "UPDATE_MESSAGE"; payload: { sessionId: string; message: AutomationMessage } };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOAD_SESSIONS":
      return { ...state, sessions: action.payload, activeSessionId: action.payload[0]?.id || null };
    case "CREATE_SESSION":
      return { ...state, sessions: [action.payload, ...state.sessions], activeSessionId: action.payload.id };
    case "SET_ACTIVE":
      return { ...state, activeSessionId: action.payload };
    case "UPDATE_TITLE":
      return {
        ...state,
        sessions: state.sessions.map((s) => (s.id === action.payload.id ? { ...s, title: action.payload.title } : s)),
      };
    case "ADD_MESSAGE":
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.payload.sessionId
            ? { ...s, messages: [...s.messages, action.payload.message] }
            : s
        ),
      };
    case "UPDATE_MESSAGE":
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.payload.sessionId
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === action.payload.message.id ? action.payload.message : m
                ),
              }
            : s
        ),
      };
    default:
      return state;
  }
}

export default function BuildPage() {
  const [state, dispatch] = useReducer(reducer, { sessions: [], activeSessionId: null });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Initialize
  useEffect(() => {
    // Dark mode
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark" || (!storedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }

    // Sidebar
    const storedSidebar = localStorage.getItem("sidebarOpen");
    if (storedSidebar !== null) setIsSidebarOpen(storedSidebar === "true");

    // Sessions
    const storedSessions = localStorage.getItem("automationSessions");
    if (storedSessions) {
      try {
        const parsed = JSON.parse(storedSessions);
        if (parsed.length > 0) {
          dispatch({ type: "LOAD_SESSIONS", payload: parsed });
          return;
        }
      } catch (e) {}
    }
    
    // Create default session if empty
    createNewSession();
  }, []);

  // Sync to local storage
  useEffect(() => {
    if (state.sessions.length > 0) {
      localStorage.setItem("automationSessions", JSON.stringify(state.sessions));
    }
  }, [state.sessions]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("theme", next ? "dark" : "light");
      if (next) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
      return next;
    });
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem("sidebarOpen", String(next));
      return next;
    });
  };

  const createNewSession = () => {
    const newSession: AutomationSession = {
      id: Date.now().toString(),
      title: "Untitled Automation",
      createdAt: Date.now(),
      messages: [],
    };
    dispatch({ type: "CREATE_SESSION", payload: newSession });
  };

  const activeSession = state.sessions.find((s) => s.id === state.activeSessionId);
  const blueprintMsg = activeSession?.messages.find((m) => m.blueprint);
  const activeBlueprint = blueprintMsg?.blueprint;

  const handleSend = (text: string) => {
    if (!activeSession || isGenerating) return;

    // 1. Add User Message
    const userMsg: AutomationMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    dispatch({ type: "ADD_MESSAGE", payload: { sessionId: activeSession.id, message: userMsg } });

    // Update title if first message
    if (activeSession.messages.length === 0) {
      dispatch({ 
        type: "UPDATE_TITLE", 
        payload: { id: activeSession.id, title: text.slice(0, 28) + (text.length > 28 ? "..." : "") } 
      });
    }

    setIsGenerating(true);

    // 2. Mock API Call
    setTimeout(() => {
      const aiMsg: AutomationMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: `I've created a blueprint based on your request. I will set up a trigger for **new Typeform entries**, map the data, and add a new row in your **Google Sheet**.\n\nPlease connect your accounts below to activate this automation.`,
        timestamp: Date.now() + 1,
        isStreaming: true, // will trigger streaming effect
        blueprint: {
          trigger: "New form submission (Typeform)",
          actions: ["Format response data", "Create spreadsheet row (Google Sheets)"],
          integrations: [
            { id: "typeform", name: "Typeform", icon: "📝", connected: false },
            { id: "gsheets", name: "Google Sheets", icon: "📊", connected: false },
          ],
          estimatedCost: 2,
        }
      };

      dispatch({ type: "ADD_MESSAGE", payload: { sessionId: activeSession.id, message: aiMsg } });
      
      // Stop streaming state after streaming completes (approx calculation)
      setTimeout(() => {
        setIsGenerating(false);
        dispatch({
          type: "UPDATE_MESSAGE",
          payload: { sessionId: activeSession.id, message: { ...aiMsg, isStreaming: false } }
        });
      }, aiMsg.content.split(" ").length * 28 + 500);

    }, 2500);
  };

  const handleStop = () => {
    setIsGenerating(false);
  };

  const handleTitleSubmit = () => {
    if (draftTitle.trim() && activeSession) {
      dispatch({ type: "UPDATE_TITLE", payload: { id: activeSession.id, title: draftTitle.trim() } });
    }
    setIsEditingTitle(false);
  };

  const startTitleEdit = () => {
    if (!activeSession) return;
    setDraftTitle(activeSession.title);
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 50);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100">
      
      {/* LEFT SIDEBAR */}
      <AutomationSidebar 
        sessions={state.sessions}
        activeSessionId={state.activeSessionId}
        onSelectSession={(id) => dispatch({ type: "SET_ACTIVE", payload: id })}
        onNewSession={createNewSession}
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
      />

      {/* CENTRE PANEL */}
      <div className="flex flex-1 flex-col min-w-0">
        
        {/* Top Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between px-4 lg:px-6 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            {/* Mobile menu handled in sidebar */}
            <div className="md:hidden w-8" /> 

            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSubmit();
                  if (e.key === "Escape") setIsEditingTitle(false);
                }}
                className="h-8 w-48 rounded bg-gray-100 dark:bg-gray-900 px-2 text-sm font-semibold text-gray-900 dark:text-white outline-none border border-sky-500/50"
              />
            ) : (
              <button 
                onClick={startTitleEdit}
                className="group flex items-center gap-2 rounded px-2 py-1 -ml-2 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {activeSession?.title || "Loading..."}
                <Edit3 className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              <div className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">8 credits remaining</span>
            </div>
            
            <button className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" title="Toggle Run/Pause">
              <Play className="h-4 w-4" />
            </button>
            <button className="hidden sm:flex h-8 items-center justify-center gap-2 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Share className="h-3.5 w-3.5" />
              Share
            </button>
            
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1" />

            <button 
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <ChatThread 
          messages={activeSession?.messages || []} 
          isGenerating={isGenerating} 
          onActivateBlueprint={(id) => console.log('Activating blueprint from message', id)}
        />

        {/* Composer Area */}
        <div className="shrink-0 bg-gradient-to-t from-white via-white to-transparent dark:from-gray-950 dark:via-gray-950 pt-4">
          <InputComposer 
            onSend={handleSend}
            isGenerating={isGenerating}
            onStop={handleStop}
            showChips={activeSession?.messages.length === 0}
          />
        </div>
      </div>

      {/* RIGHT PANEL */}
      <AutomationPreview 
        blueprint={activeBlueprint} 
        isGenerating={isGenerating}
      />

    </div>
  );
}
