import { getBrowserStorage } from '../lib/safeStorage';
import { getFirebaseConfig } from './config';
import { LocalRepo } from './localRepo';
import type { Repo } from './repo';

/** 有設定 Firebase 就用雲端模式,否則使用本機測試模式。Firebase 程式碼是動態載入的。 */
export async function createRepo(): Promise<Repo> {
  const config = getFirebaseConfig();
  if (config) {
    const { FirebaseRepo } = await import('./firebaseRepo');
    return new FirebaseRepo(config);
  }
  return new LocalRepo(getBrowserStorage('local'), () => new Date(), window);
}
