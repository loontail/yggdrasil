export interface PlayerSkin {
  id: number;
  userId: number;
  username?: string | null;
  filePath: string;
  fileUrl: string;
  fileSize?: number | null;
  variant?: 'CLASSIC' | 'SLIM';
  createdAt?: string;
  updatedAt?: string;
}

export interface PlayerCape {
  id: number;
  userId: number;
  username?: string | null;
  filePath: string;
  fileUrl: string;
  fileSize?: number | null;
  createdAt?: string;
  updatedAt?: string;
}
