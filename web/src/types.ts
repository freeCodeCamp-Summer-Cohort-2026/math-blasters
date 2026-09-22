export type Theme = 'light' | 'dark' | 'system';

export interface Account {
  id: string;
  displayName: string;
  avatarUrl?: string;
}
