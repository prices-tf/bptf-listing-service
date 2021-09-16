import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({
  name: 'snapshot2',
})
export class Snapshot {
  @PrimaryColumn()
  readonly sku: string;

  @Column()
  readonly createdAt: Date;
}
