import type { FirebaseOptions } from 'firebase/app';

/** 讀取 Firebase 設定;缺少必要欄位時回傳 null,網站會改用「本機測試模式」 */
export function getFirebaseConfig(): FirebaseOptions | null {
  const env = import.meta.env;
  const apiKey = env.VITE_FIREBASE_API_KEY?.trim();
  const projectId = env.VITE_FIREBASE_PROJECT_ID?.trim();
  const appId = env.VITE_FIREBASE_APP_ID?.trim();
  if (!apiKey || !projectId || !appId) return null;
  return {
    apiKey,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || undefined,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || undefined,
    appId,
  };
}

/**
 * 主召後台「測試入口」密碼。
 * ⚠ 前端的密碼會被打包進網頁,任何人都能找到,所以這「不是」安全機制,只是防止誤觸。
 */
export function getAdminPin(): string {
  return import.meta.env.VITE_ADMIN_PIN?.trim() || 'luxe2026';
}
