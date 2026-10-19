import { useCallback, useEffect, useState } from 'react';

// 使用網址 # 後面的部分當路由(例如 #/cart),不需要伺服器設定,
// 部署在 GitHub Pages 的任何子路徑都能正常運作。
const readPath = (): string => window.location.hash.replace(/^#/, '') || '/';

export function useHashRoute(): { path: string; navigate: (to: string) => void } {
  const [path, setPath] = useState<string>(readPath);

  useEffect(() => {
    const onChange = () => {
      setPath(readPath());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);

  return { path, navigate };
}
