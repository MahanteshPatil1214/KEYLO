export type AdminRoleName = "ADMIN" | "SALES_EXECUTIVE" | "BUYER";

export type RoleInfo = {
  id: string;
  name: AdminRoleName;
  description: string | null;
};

export type UserItem = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: RoleInfo;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type UserListResponse = {
  items: UserItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type UserMetrics = {
  total: number;
  active: number;
  deactivated: number;
  admins: number;
  sales_executives: number;
  buyers: number;
};

export type CreateUserPayload = {
  full_name: string;
  email: string;
  password: string;
  phone?: string | null;
  role: AdminRoleName;
  is_active: boolean;
};

export type UpdateUserPayload = {
  full_name?: string;
  phone?: string | null;
  role?: AdminRoleName;
};

export type UserFilterState = {
  search: string;
  role: AdminRoleName | "ALL";
  status: "ALL" | "ACTIVE" | "DEACTIVATED";
  page: number;
  pageSize: number;
};

