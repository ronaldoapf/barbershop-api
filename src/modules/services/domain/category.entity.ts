export class CategoryEntity {
  id: string;
  name: string;
  order: number;
  createdAt: Date;
  disabledAt: Date | null;
}
