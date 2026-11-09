"use client";
// components/providers/PrivacyProvider.js
// App-wide "blur figures" privacy mode.
// Figures are detected across active scopes (main content and open modals)
// and blurred via CSS while active. Toggled via Alt+B, top bar eye button, or command palette.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSettings } from "@/components/providers/SettingsProvider";
import { looksLikeFigure } from "@/lib/privacy/figureDetection";

const STORAGE_KEY = "pf-blur-figures";
const BLUR_ATTRIBUTE = "data-pf-blur";
const ROOT_ID = "main-content";

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION",
  "SVG",
]);

const PrivacyContext = createContext({
  blurFigures: false,
  toggleBlurFigures: () => {},
  setBlurFigures: () => {},
});

function readStoredPreference() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    return raw === "true";
  } catch {
    return null;
  }
}

function isSkippable(element) {
  if (!element) return true;
  if (SKIP_TAGS.has(element.tagName)) return true;
  if (element.isContentEditable) return true;
  return Boolean(element.closest("[data-no-blur]"));
}

function getScopes() {
  if (typeof document === "undefined") return [];
  const scopes = [];
  const main = document.getElementById(ROOT_ID);
  if (main) scopes.push(main);
  document.querySelectorAll("[data-privacy-scope], [role='dialog']").forEach((el) => {
    if (!scopes.includes(el) && (!main || !main.contains(el))) {
      scopes.push(el);
    }
  });
  return scopes;
}

// Walk the scope's text nodes, mark the smallest containing element for each
// figure-like value, and drop markers that no longer match.
function syncFigureMarkers(root) {
  if (!root) return;

  const matched = new Set();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !looksLikeFigure(node.nodeValue)) {
        return NodeFilter.FILTER_REJECT;
      }
      const parent = node.parentElement;
      if (isSkippable(parent)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node = walker.nextNode();
  while (node) {
    matched.add(node.parentElement);
    node = walker.nextNode();
  }

  root.querySelectorAll(`[${BLUR_ATTRIBUTE}]`).forEach((element) => {
    if (!matched.has(element)) element.removeAttribute(BLUR_ATTRIBUTE);
  });
  matched.forEach((element) => element.setAttribute(BLUR_ATTRIBUTE, ""));
}

function clearFigureMarkers(root) {
  if (!root) return;
  root.querySelectorAll(`[${BLUR_ATTRIBUTE}]`).forEach((element) => {
    element.removeAttribute(BLUR_ATTRIBUTE);
  });
}

function PrivacyBlurEngine({ active }) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (!active) {
      getScopes().forEach(clearFigureMarkers);
      return;
    }

    let frame = 0;
    const scheduleSync = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const scopes = getScopes();
        scopes.forEach(syncFigureMarkers);
      });
    };

    scheduleSync();
    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [active]);

  return null;
}

export function PrivacyProvider({ initialBlur = false, children }) {
  const { updateSettingsState } = useSettings();
  const [blurFigures, setBlurFiguresState] = useState(Boolean(initialBlur));
  const blurRef = useRef(Boolean(initialBlur));

  // Sync if the persisted account setting changes after a settings save.
  const [prevInitial, setPrevInitial] = useState(Boolean(initialBlur));
  const incoming = Boolean(initialBlur);
  if (incoming !== prevInitial) {
    setPrevInitial(incoming);
    setBlurFiguresState(incoming);
  }

  // Restore the browser-local preference once mounted (never during render, so
  // server and client initial markup match).
  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = readStoredPreference();
      if (stored !== null && stored !== blurRef.current) {
        blurRef.current = stored;
        setBlurFiguresState(stored);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Keep the ref aligned with committed state for event handlers.
  useEffect(() => {
    blurRef.current = blurFigures;
  }, [blurFigures]);

  // Reflect state on <html> so CSS can react without prop drilling.
  useEffect(() => {
    document.documentElement.dataset.blurFigures = blurFigures ? "true" : "false";
  }, [blurFigures]);

  const persistPreference = useCallback(
    (value) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(value));
      } catch {
        // Storage may be unavailable (private mode); the toggle still works.
      }
      updateSettingsState({
        security: { hideSensitiveValues: value },
        financial: { hideBalancesByDefault: value },
      });
      fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            security: { hideSensitiveValues: value },
            financial: { hideBalancesByDefault: value },
          },
        }),
      }).catch(() => {});
    },
    [updateSettingsState]
  );

  const setBlurFigures = useCallback(
    (next) => {
      const value = typeof next === "function" ? next(blurRef.current) : Boolean(next);
      blurRef.current = value;
      setBlurFiguresState(value);
      persistPreference(value);
    },
    [persistPreference]
  );

  const toggleBlurFigures = useCallback(() => {
    const value = !blurRef.current;
    blurRef.current = value;
    setBlurFiguresState(value);
    persistPreference(value);
  }, [persistPreference]);

  // Global shortcut (Alt+B) and command-palette bridge.
  useEffect(() => {
    function onKeyDown(event) {
      if (
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.key.toLowerCase() === "b"
      ) {
        event.preventDefault();
        toggleBlurFigures();
      }
    }
    function onToggleEvent() {
      toggleBlurFigures();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("toggle-privacy-blur", onToggleEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("toggle-privacy-blur", onToggleEvent);
    };
  }, [toggleBlurFigures]);

  const value = useMemo(
    () => ({ blurFigures, toggleBlurFigures, setBlurFigures }),
    [blurFigures, toggleBlurFigures, setBlurFigures]
  );

  return (
    <PrivacyContext.Provider value={value}>
      <PrivacyBlurEngine active={blurFigures} />
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
