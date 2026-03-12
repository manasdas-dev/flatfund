import { useEffect, useState } from "react";

export function useFCM() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(null);
    setError(null);
  }, []);

  return { token, error };
}
