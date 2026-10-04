import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitDatabase1711123456789 implements MigrationInterface {
  name = 'InitDatabase1711123456789';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "prompt_template" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "type" character varying(50) NOT NULL, "content" text NOT NULL, "variables" jsonb, "version" character varying(20) NOT NULL DEFAULT '1.0.0', "enabled" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_01a2960dbe949ac6990b0882f90" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_28e8cd14eeff834701decb08ba" ON "prompt_template" ("name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_13d36be93f6a3b4d4c2359c5b4" ON "prompt_template" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_19ce6080cf5ae930ce4c5e8d83" ON "prompt_template" ("enabled") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_af2066d41927a29590fefeeadf" ON "prompt_template" ("type", "enabled") `,
    );
    await queryRunner.query(
      `CREATE TABLE "novel_genre" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(50) NOT NULL, "label" character varying(100), "sortOrder" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_bb07f542119ba26dfc27ace682b" UNIQUE ("name"), CONSTRAINT "PK_717307c7ee3b55f765ebba006ca" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bb07f542119ba26dfc27ace682" ON "novel_genre" ("name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "novel_genre_map" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "novelId" uuid NOT NULL, "genreId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ddc6cbdf846513b776588bf81d5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_07e6aa8a49f2a88ccca6180ae3" ON "novel_genre_map" ("novelId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6133465b07d66b4b07de66ff9f" ON "novel_genre_map" ("genreId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7ad450cbe1b7095e3db1bd5d4b" ON "novel_genre_map" ("novelId", "genreId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."novel_character_roletype_enum" AS ENUM('protagonist', 'supporting', 'antagonist', 'minor')`,
    );
    await queryRunner.query(
      `CREATE TABLE "novel_character" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "novelId" uuid NOT NULL, "name" character varying(100) NOT NULL, "roleType" "public"."novel_character_roletype_enum" NOT NULL DEFAULT 'minor', "gender" character varying(20), "age" character varying(50), "identity" text, "personality" text, "appearance" text, "background" text, "ability" text, "relationship" text, "goals" text, "secrets" text, "notes" text, "sortOrder" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e32bb36c66c45ef696c5f2b9386" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_213642aa79245792833fb9c8a9" ON "novel_character" ("novelId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_64ffc0f4e5bfd5d7bdd668551f" ON "novel_character" ("novelId", "sortOrder") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."novel_chapter_status_enum" AS ENUM('draft', 'generating', 'completed', 'published')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."novel_chapter_generationstatus_enum" AS ENUM('pending', 'generating', 'completed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "novel_chapter" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "novelId" uuid NOT NULL, "chapterNumber" integer NOT NULL, "title" character varying(200) NOT NULL, "summary" text, "content" text, "wordCount" integer NOT NULL DEFAULT '0', "status" "public"."novel_chapter_status_enum" NOT NULL DEFAULT 'draft', "generationStatus" "public"."novel_chapter_generationstatus_enum" NOT NULL DEFAULT 'pending', "outlineId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_df325e83936d51a23143f5f8cbe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0191fdca407e9f409b94671463" ON "novel_chapter" ("novelId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2158716e8f08d285ecb6c239ad" ON "novel_chapter" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_34d953bac304bf9b422de544c5" ON "novel_chapter" ("generationStatus") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c9eb3652ae27b7465377a28955" ON "novel_chapter" ("outlineId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7e17a4bceeb9e9d9eaa4c8b566" ON "novel_chapter" ("novelId", "chapterNumber") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ai_task_tasktype_enum" AS ENUM('generate_title', 'generate_description', 'generate_character', 'generate_world_setting', 'generate_outline', 'generate_chapter', 'rewrite_chapter', 'continue_chapter')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ai_task_status_enum" AS ENUM('pending', 'running', 'completed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ai_task" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "taskType" "public"."ai_task_tasktype_enum" NOT NULL, "status" "public"."ai_task_status_enum" NOT NULL DEFAULT 'pending', "novelId" uuid NOT NULL, "chapterId" uuid, "outlineId" uuid, "input" jsonb, "output" jsonb, "error" text, "progress" real NOT NULL DEFAULT '0', "startedAt" TIMESTAMP, "completedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0f3c66f4209ef2366df516eb232" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_921a152a4609b9bdc262d05f9b" ON "ai_task" ("taskType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1b427022f379a494de3e08336b" ON "ai_task" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5a2c80f28dd2ec043576a456ad" ON "ai_task" ("novelId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1ac79bc766a5c8760960e22259" ON "ai_task" ("chapterId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d73d1daae7e64fea84883564a3" ON "ai_task" ("outlineId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e108c2d5575851e8b9fd6e4cc8" ON "ai_task" ("status", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4977a2e3810e9cecc3d7251d98" ON "ai_task" ("novelId", "status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."novel_status_enum" AS ENUM('draft', 'in_progress', 'completed', 'paused')`,
    );
    await queryRunner.query(
      `CREATE TABLE "novel" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(200) NOT NULL, "description" text, "cover" character varying(100), "status" "public"."novel_status_enum" NOT NULL DEFAULT 'draft', "targetWordCount" integer NOT NULL DEFAULT '0', "chapterCount" integer NOT NULL DEFAULT '0', "currentChapter" integer NOT NULL DEFAULT '0', "writingStyle" text, "pointOfView" character varying(50), "targetAudience" character varying(100), "worldSetting" text, "protagonistSetting" text, "powerSystem" text, "coreConflict" text, "mainStoryDirection" text, "creationConfig" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b0fea0838ae7d287445c53d6139" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_712932cdd8f2602d625b09da54" ON "novel" ("status") `);
    await queryRunner.query(
      `CREATE TYPE "public"."novel_outline_type_enum" AS ENUM('general', 'volume', 'arc', 'chapter_plan')`,
    );
    await queryRunner.query(
      `CREATE TABLE "novel_outline" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "novelId" uuid NOT NULL, "type" "public"."novel_outline_type_enum" NOT NULL, "title" character varying(200) NOT NULL, "summary" text, "content" text, "sortOrder" integer NOT NULL DEFAULT '0', "parentId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b5de1d2e1e5aa8073c07e6f41a5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c986e6c98bcd5f17dad99e1d16" ON "novel_outline" ("novelId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eb6d30da35f1f532cba4db426c" ON "novel_outline" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_856f54085e647c7a41fb71189a" ON "novel_outline" ("parentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_15ea1351b96f065a2be0e14a30" ON "novel_outline" ("novelId", "sortOrder") `,
    );
    await queryRunner.query(
      `ALTER TABLE "novel_genre_map" ADD CONSTRAINT "FK_07e6aa8a49f2a88ccca6180ae3a" FOREIGN KEY ("novelId") REFERENCES "novel"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "novel_genre_map" ADD CONSTRAINT "FK_6133465b07d66b4b07de66ff9f2" FOREIGN KEY ("genreId") REFERENCES "novel_genre"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "novel_character" ADD CONSTRAINT "FK_213642aa79245792833fb9c8a90" FOREIGN KEY ("novelId") REFERENCES "novel"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "novel_chapter" ADD CONSTRAINT "FK_0191fdca407e9f409b94671463f" FOREIGN KEY ("novelId") REFERENCES "novel"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "novel_chapter" ADD CONSTRAINT "FK_c9eb3652ae27b7465377a289556" FOREIGN KEY ("outlineId") REFERENCES "novel_outline"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_task" ADD CONSTRAINT "FK_5a2c80f28dd2ec043576a456adf" FOREIGN KEY ("novelId") REFERENCES "novel"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_task" ADD CONSTRAINT "FK_1ac79bc766a5c8760960e222592" FOREIGN KEY ("chapterId") REFERENCES "novel_chapter"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_task" ADD CONSTRAINT "FK_d73d1daae7e64fea84883564a37" FOREIGN KEY ("outlineId") REFERENCES "novel_outline"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "novel_outline" ADD CONSTRAINT "FK_c986e6c98bcd5f17dad99e1d160" FOREIGN KEY ("novelId") REFERENCES "novel"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "novel_outline" ADD CONSTRAINT "FK_856f54085e647c7a41fb71189a1" FOREIGN KEY ("parentId") REFERENCES "novel_outline"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "novel_outline" DROP CONSTRAINT "FK_856f54085e647c7a41fb71189a1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "novel_outline" DROP CONSTRAINT "FK_c986e6c98bcd5f17dad99e1d160"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_task" DROP CONSTRAINT "FK_d73d1daae7e64fea84883564a37"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_task" DROP CONSTRAINT "FK_1ac79bc766a5c8760960e222592"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_task" DROP CONSTRAINT "FK_5a2c80f28dd2ec043576a456adf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "novel_chapter" DROP CONSTRAINT "FK_c9eb3652ae27b7465377a289556"`,
    );
    await queryRunner.query(
      `ALTER TABLE "novel_chapter" DROP CONSTRAINT "FK_0191fdca407e9f409b94671463f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "novel_character" DROP CONSTRAINT "FK_213642aa79245792833fb9c8a90"`,
    );
    await queryRunner.query(
      `ALTER TABLE "novel_genre_map" DROP CONSTRAINT "FK_6133465b07d66b4b07de66ff9f2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "novel_genre_map" DROP CONSTRAINT "FK_07e6aa8a49f2a88ccca6180ae3a"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_15ea1351b96f065a2be0e14a30"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_856f54085e647c7a41fb71189a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_eb6d30da35f1f532cba4db426c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c986e6c98bcd5f17dad99e1d16"`);
    await queryRunner.query(`DROP TABLE "novel_outline"`);
    await queryRunner.query(`DROP TYPE "public"."novel_outline_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_712932cdd8f2602d625b09da54"`);
    await queryRunner.query(`DROP TABLE "novel"`);
    await queryRunner.query(`DROP TYPE "public"."novel_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4977a2e3810e9cecc3d7251d98"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e108c2d5575851e8b9fd6e4cc8"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d73d1daae7e64fea84883564a3"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1ac79bc766a5c8760960e22259"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5a2c80f28dd2ec043576a456ad"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1b427022f379a494de3e08336b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_921a152a4609b9bdc262d05f9b"`);
    await queryRunner.query(`DROP TABLE "ai_task"`);
    await queryRunner.query(`DROP TYPE "public"."ai_task_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."ai_task_tasktype_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7e17a4bceeb9e9d9eaa4c8b566"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c9eb3652ae27b7465377a28955"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_34d953bac304bf9b422de544c5"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2158716e8f08d285ecb6c239ad"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0191fdca407e9f409b94671463"`);
    await queryRunner.query(`DROP TABLE "novel_chapter"`);
    await queryRunner.query(`DROP TYPE "public"."novel_chapter_generationstatus_enum"`);
    await queryRunner.query(`DROP TYPE "public"."novel_chapter_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_64ffc0f4e5bfd5d7bdd668551f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_213642aa79245792833fb9c8a9"`);
    await queryRunner.query(`DROP TABLE "novel_character"`);
    await queryRunner.query(`DROP TYPE "public"."novel_character_roletype_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7ad450cbe1b7095e3db1bd5d4b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6133465b07d66b4b07de66ff9f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_07e6aa8a49f2a88ccca6180ae3"`);
    await queryRunner.query(`DROP TABLE "novel_genre_map"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bb07f542119ba26dfc27ace682"`);
    await queryRunner.query(`DROP TABLE "novel_genre"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_af2066d41927a29590fefeeadf"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_19ce6080cf5ae930ce4c5e8d83"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_13d36be93f6a3b4d4c2359c5b4"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_28e8cd14eeff834701decb08ba"`);
    await queryRunner.query(`DROP TABLE "prompt_template"`);
  }
}
