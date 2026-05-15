"use client";
import { useState } from "react";

export default function CopyPhoneButton({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button onClick={copy} className="bg-teal-100 text-teal-700 text-xs px-2.5 py-1 rounded hover:bg-teal-200 transition font-medium">
      {copied ? "Copied!" : "Copy Phone"}
    </button>
  );
}
