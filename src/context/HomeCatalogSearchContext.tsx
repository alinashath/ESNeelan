import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type HomeCatalogSearchContextValue = {
  search: string;
  setSearch: (next: string) => void;
};

const HomeCatalogSearchContext =
  createContext<HomeCatalogSearchContextValue | null>(null);

export function HomeCatalogSearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearchState] = useState("");
  const setSearch = useCallback((next: string) => {
    setSearchState(next);
  }, []);
  const value = useMemo(
    () => ({ search, setSearch }),
    [search, setSearch],
  );
  return (
    <HomeCatalogSearchContext.Provider value={value}>
      {children}
    </HomeCatalogSearchContext.Provider>
  );
}

export function useHomeCatalogSearch(): HomeCatalogSearchContextValue {
  const ctx = useContext(HomeCatalogSearchContext);
  if (!ctx) {
    throw new Error(
      "useHomeCatalogSearch must be used within HomeCatalogSearchProvider",
    );
  }
  return ctx;
}
