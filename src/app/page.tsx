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

      {result?.success && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <h2 className="font-bold mb-2">Available Data Sources:</h2>
          <ul className="list-disc pl-5">
            {result.results.map((ds: any) => (
              <li key={ds.id} className="text-sm font-mono text-blue-600">
                {ds.id}
              </li>
            ))}
          </ul>
        </div>
      )}

      <pre className="mt-6 text-xs whitespace-pre-wrap">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}