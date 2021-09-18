import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Snapshot {
  @PrimaryColumn()
  readonly sku: string;

  @Column()
  readonly createdAt: Date;
}
