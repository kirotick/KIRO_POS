import { useCallback, useEffect, useRef, useState } from 'react';
// Runs an async loader, exposes {data, error, loading, reload}. Ignores answers that arrive after the screen changed.
export function useLoad(fn, deps) {
  const [st, setSt] = useState({ data: null, error: null, loading: true });
  const alive = useRef(0);
  const run = useCallback(() => {
    const id = ++alive.current; setSt((p) => ({ ...p, loading: true, error: null }));
    fn().then((data) => { if (id === alive.current) setSt({ data, error: null, loading: false }); },
      (e) => { if (id === alive.current) setSt({ data: null, error: e && e.message ? e.message : 'Something went wrong', loading: false }); });
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { run(); return () => { alive.current++; }; }, [run]);
  return { ...st, reload: run };
}
