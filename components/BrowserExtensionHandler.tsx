"use client";

import { useEffect } from "react";

export function BrowserExtensionHandler() {
  useEffect(() => {
    // Remove browser extension attributes that cause hydration mismatches
    document.body.removeAttribute("cz-shortcut-listen");
  }, []);

  return null;
}
