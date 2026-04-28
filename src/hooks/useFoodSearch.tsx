import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface USDAFood {
  fdcId: number;
  name: string;
  emoji: string;
  per100: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fibre: number;
  };
  source: string;
  brandOwner: string | null;
  servingSize: number;
  servingSizeUnit: string;
  score: number;
}

export interface BarcodeProduct {
  barcode: string;
  name: string;
  emoji: string;
  brand: string | null;
  imageUrl: string | null;
  per100: { kcal: number; protein: number; carbs: number; fat: number; fibre: number };
  serving: { size: number; unit: string; kcal: number; protein: number; carbs: number; fat: number; fibre: number };
  nutriScore: string | null;
  score: number;
  source: string;
}

export function useFoodSearch() {
  const [results, setResults] = useState<USDAFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    // Cancel previous in-flight search
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("food-search", {
        body: { query: query.trim(), pageSize: 20 },
      });

      if (fnError) throw fnError;
      if (data?.error && !data?.results?.length) {
        setError(data.error);
        setResults([]);
        return;
      }

      setResults(data?.results ?? []);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Search failed";
      setError(msg);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const lookupBarcode = useCallback(async (barcode: string): Promise<BarcodeProduct | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("barcode-lookup", {
        body: { barcode },
      });
      if (fnError) throw fnError;
      if (!data?.found) return null;
      return data.product as BarcodeProduct;
    } catch (e) {
      console.error("Barcode lookup failed:", e);
      return null;
    }
  }, []);

  return { results, loading, error, search, lookupBarcode };
}
