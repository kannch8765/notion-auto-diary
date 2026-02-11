"use client";

import { useState } from "react";

export default function Home() {
  const [result, setResult] = useState<any>(null);

  async function testNotion() {
    const res = await fetch("/api/notion/test");
    const data = await res.json();
    setResult(data);
  }

  return (
    <div className="p-10">
      <button
        onClick={testNotion}
        className="px-4 py-2 bg-black text-white rounded"
      >
        Test Notion Connection
      </button>

      <pre className="mt-6 text-xs whitespace-pre-wrap">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}
