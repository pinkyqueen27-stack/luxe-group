// LUXE GROUP 資料型別。
// 注意:資料會存進 Firestore,Firestore 不接受 undefined,所以「沒有值」一律用 null。

/** 團購活動狀態:準備中 / 開放訂購 / 停止訂購 / 已結單 */
export type GroupStatus = 'preparing' | 'open' | 'closed' | 'finished';

export interface GroupBuy {
  id: string;
  name: string;
  description: string;
  /** 截止時間(ISO 8601 字串) */
  deadline: string;
  status: GroupStatus;
  updatedAt: string;
}

export interface Product {
  id: string;
  groupBuyId: string;
  name: string;
  spec: string;
  category: string;
  unit: string;
  price: number;
  /** 每團成團門檻(件) */
  groupSize: number;
  /** 最低訂購量(訂購時至少要這麼多,0 件代表不訂購) */
  minQty: number;
  /** 每人限購量,null = 未設定(預設上限 99) */
  perPersonLimit: number | null;
  /** 活動總限購量,null = 不限 */
  totalLimit: number | null;
  description: string;
  /** 商品圖片網址,空字串 = 使用系統產生的示意圖 */
  imageUrl: string;
  /** false = 下架(前台不顯示,但既有訂單仍保留) */
  active: boolean;
  sortOrder: number;
}

export interface Member {
  id: string;
  name: string;
}

/** draft = 編輯中(尚未最終確認) / confirmed = 已最終確認 / cancelled = 已取消 */
export type OrderStatus = 'draft' | 'confirmed' | 'cancelled';

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface Order {
  /** 唯一 ID:`${團購ID}__${團員ID}`,每位團員在每次團購只會有一張訂單 */
  id: string;
  groupBuyId: string;
  memberId: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  /** 主召解鎖(重新開放修改)的時間 */
  reopenedAt: string | null;
}

export interface Announcement {
  id: string;
  groupBuyId: string;
  title: string;
  body: string;
  publishedAt: string;
}

/** 整個應用程式使用的資料快照 */
export interface AppData {
  groupBuy: GroupBuy | null;
  products: Product[];
  members: Member[];
  orders: Order[];
  announcement: Announcement | null;
}
