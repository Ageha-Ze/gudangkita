export type ModalType = 'add' | 'edit' | '';

export interface BaseEntity {
  id: number;
  created_at?: string;
  updated_at?: string;
}
