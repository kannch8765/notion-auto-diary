"use client";

import { useState } from "react";

type DataSourceRef = {
  id: string;
  name: string;
};

type ConfiguredDatabase = {
  envKey: string;
  databaseId: string;
};

type DataSourceProperty = {
  key: string;
  id: string;
  name: string;
  type: string;
};

export default function Home() {
  const [databases, setDatabases] = useState<ConfiguredDatabase[]>([]);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string>("");
  const [dataSources, setDataSources] = useState<DataSourceRef[]>([]);
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string>("");
  const [properties, setProperties] = useState<DataSourceProperty[]>([]);
  const [selectedPropertyKey, setSelectedPropertyKey] = useState<string>("");
  const [rawResult, setRawResult] = useState<unknown>(null);
  const [error, setError] = useState<string>("");
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [loadingDataSources, setLoadingDataSources] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(false);

  async function loadDatabases() {
    setError("");
    setLoadingDatabases(true);
    setDatabases([]);
    setSelectedDatabaseId("");
    setDataSources([]);
    setSelectedDataSourceId("");
    setProperties([]);
    setSelectedPropertyKey("");

    try {
      const res = await fetch("/api/notion/databases");
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        results?: unknown;
      };
      setRawResult(data);

      if (!data?.success) {
        setError(data?.error ?? "Failed to load databases");
        return;
      }

      const dbs = Array.isArray(data.results) ? (data.results as ConfiguredDatabase[]) : [];
      setDatabases(dbs);

      if (dbs.length > 0) {
        setSelectedDatabaseId(dbs[0].databaseId);
        void loadDataSources(dbs[0].databaseId);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message || "Failed to load databases");
    } finally {
      setLoadingDatabases(false);
    }
  }

  async function loadDataSources(databaseId: string) {
    setError("");
    setLoadingDataSources(true);
    setSelectedDataSourceId("");
    setProperties([]);
    setSelectedPropertyKey("");

    try {
      const res = await fetch(`/api/notion/data-sources?databaseId=${encodeURIComponent(databaseId)}`);
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        results?: unknown;
      };
      setRawResult(data);

      if (!data?.success) {
        setError(data?.error ?? "Failed to load data sources");
        setDataSources([]);
        return;
      }

      setDataSources(Array.isArray(data.results) ? (data.results as DataSourceRef[]) : []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message || "Failed to load data sources");
      setDataSources([]);
    } finally {
      setLoadingDataSources(false);
    }
  }

  async function loadProperties(dataSourceId: string) {
    setError("");
    setLoadingProperties(true);
    setProperties([]);
    setSelectedPropertyKey("");

    try {
      const res = await fetch(`/api/notion/data-sources/${encodeURIComponent(dataSourceId)}`);
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        properties?: unknown;
      };
      setRawResult(data);

      if (!data?.success) {
        setError(data?.error ?? "Failed to load properties");
        return;
      }

      const props: DataSourceProperty[] = Array.isArray(data.properties)
        ? (data.properties as DataSourceProperty[])
        : [];
      setProperties(props);
      const defaultKey = props.find((p) => p.type === "title")?.key ?? props[0]?.key ?? "";
      setSelectedPropertyKey(defaultKey);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message || "Failed to load properties");
    } finally {
      setLoadingProperties(false);
    }
  }

  return (
    <div className="p-10">
      <div className="flex items-center gap-3">
        <button
          onClick={loadDatabases}
          disabled={loadingDatabases}
          className="px-4 py-2 bg-black text-white rounded disabled:opacity-60"
        >
          {loadingDatabases ? "Loading…" : "Load Databases"}
        </button>

        {databases.length > 0 && (
          <select
            value={selectedDatabaseId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedDatabaseId(id);
              if (id) void loadDataSources(id);
            }}
            className="border rounded px-3 py-2"
          >
            {databases.map((db) => (
              <option key={db.envKey} value={db.databaseId}>
                {db.envKey} ({db.databaseId})
              </option>
            ))}
          </select>
        )}

        {dataSources.length > 0 && (
          <select
            value={selectedDataSourceId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedDataSourceId(id);
              if (id) void loadProperties(id);
            }}
            className="border rounded px-3 py-2"
          >
            <option value="">Select a data source…</option>
            {dataSources.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name} ({ds.id})
              </option>
            ))}
          </select>
        )}

        {loadingDataSources && <div className="text-sm text-gray-600">Loading data sources…</div>}

        {loadingProperties && <div className="text-sm text-gray-600">Loading properties…</div>}
      </div>

      {error && (
        <div className="mt-4 p-3 border rounded bg-red-50 text-red-800 text-sm">{error}</div>
      )}

      {properties.length > 0 && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <div className="font-bold mb-3">Available Properties</div>

          <div className="flex items-center gap-3 mb-4">
            <div className="text-sm text-gray-700">Use this property as input:</div>
            <select
              value={selectedPropertyKey}
              onChange={(e) => setSelectedPropertyKey(e.target.value)}
              className="border rounded px-3 py-2"
            >
              {properties.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name} [{p.type}]
                </option>
              ))}
            </select>
          </div>

          <ul className="list-disc pl-5 space-y-1">
            {properties.map((p) => (
              <li key={p.key} className="text-sm">
                <span className="font-mono">{p.name}</span> <span className="text-gray-600">({p.type})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <pre className="mt-6 text-xs whitespace-pre-wrap">{JSON.stringify(rawResult, null, 2)}</pre>
    </div>
  );
}
