import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiProviderConfig1790021354305 implements MigrationInterface {
  name = 'AddAiProviderConfig1790021354305';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建 ai_provider_config 表
    await queryRunner.query(`
      CREATE TABLE "ai_provider_config" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(50) NOT NULL,
        "label" character varying(100) NOT NULL,
        "baseUrl" text NOT NULL,
        "apiKeyEncrypted" text NOT NULL,
        "model" character varying(100) NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "priority" integer NOT NULL DEFAULT 0,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_provider_config" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ai_provider_name" ON "ai_provider_config" ("name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ai_provider_enabled" ON "ai_provider_config" ("enabled")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_ai_provider_enabled"`);
    await queryRunner.query(`DROP INDEX "IDX_ai_provider_name"`);
    await queryRunner.query(`DROP TABLE "ai_provider_config"`);
  }
}
