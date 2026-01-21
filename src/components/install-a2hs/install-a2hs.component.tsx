"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallA2HS() {
  const [supportsInstall, setSupportsInstall] = useState(false);
  const [isIosSafari, setIsIosSafari] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // Detect environments
  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/crios|fxios|chrome|edg/.test(ua);
    setIsIosSafari(iOS && isSafari);

    // already installed? (standalone display mode)
    const standalone =
      (window.matchMedia &&
        window.matchMedia("(display-mode: standalone)").matches) ||
      (window.navigator as any).standalone;
    setIsInstalled(!!standalone);

    // capture install prompt (Android/Chrome, Edge, etc.)
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setSupportsInstall(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall as any);

    const onAppInstalled = () => {
      setIsInstalled(true);
      setSupportsInstall(false);
      deferredPromptRef.current = null;
    };
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall as any);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const showInstallBtn = useMemo(
    () => supportsInstall && !isInstalled,
    [supportsInstall, isInstalled]
  );
  const showIosHelp = useMemo(
    () => isIosSafari && !isInstalled,
    [isIosSafari, isInstalled]
  );

  const install = async () => {
    const evt = deferredPromptRef.current;
    if (!evt) return;
    await evt.prompt();
    try {
      await evt.userChoice; // optional: await the result
    } finally {
      // Only usable once
      deferredPromptRef.current = null;
      setSupportsInstall(false);
    }
  };

  if (isInstalled) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {showInstallBtn && (
        <button
          onClick={install}
          className="px-3 py-1 rounded-xl border border-gray-400 bg-[#372d66ff] shadow-xl hover:bg-[#3c365bff]"
        >
          <span className="text-white font-semibold">Install App</span>
        </button>
      )}

      {showIosHelp && (
        <button
          onClick={() =>
            alert(
              "To install:\n1) Tap the Share button\n2) Choose “Add to Home Screen”\n3) Tap Add"
            )
          }
          className="px-3 py-1 rounded-xl border border-gray-400 bg-[#372d66ff] shadow-xl hover:bg-[#3c365bff]"
        >
          <span className="text-white font-semibold">
            Add to Home Screen (iOS)
          </span>
        </button>
      )}
    </div>
  );
}
