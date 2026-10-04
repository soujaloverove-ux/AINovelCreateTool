import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTokenUsage1790021354304 implements MigrationInterface {
  name = 'AddTokenUsage1790021354304';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "ai_task"
            ADD "tokenUsage" jsonb
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "ai_task" DROP COLUMN "tokenUsage"
        `);
  }
}
