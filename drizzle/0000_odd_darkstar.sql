CREATE TYPE "public"."payroll_status" AS ENUM('draft', 'finalised');--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"uif_ref" text,
	"paye_ref" text,
	"coid_ref" text
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_number" text,
	"name" text NOT NULL,
	"known_as" text,
	"id_number" text,
	"department" text,
	"job_title" text,
	"paypoint" text,
	"date_engaged" date,
	"rate_month" numeric(10, 2) NOT NULL,
	"bank_name" text,
	"bank_account" text,
	"branch_code" text,
	"active" boolean DEFAULT true NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "payroll_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"basic_salary" numeric(10, 2) DEFAULT '0' NOT NULL,
	"overtime_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"overtime_label" text,
	"other_earnings" numeric(10, 2) DEFAULT '0' NOT NULL,
	"other_earnings_label" text,
	"uif_employee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"uif_employer" numeric(10, 2) DEFAULT '0' NOT NULL,
	"paye" numeric(10, 2) DEFAULT '0' NOT NULL,
	"shop_deduction" numeric(10, 2) DEFAULT '0' NOT NULL,
	"other_deductions" numeric(10, 2) DEFAULT '0' NOT NULL,
	"other_deductions_label" text,
	"gross_pay" numeric(10, 2) DEFAULT '0' NOT NULL,
	"net_pay" numeric(10, 2) DEFAULT '0' NOT NULL,
	"paye_threshold_flag" boolean DEFAULT false NOT NULL,
	"notes" text,
	CONSTRAINT "payroll_entries_run_employee_unique" UNIQUE("run_id","employee_id")
);
--> statement-breakpoint
CREATE TABLE "payroll_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" "payroll_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_runs_period_unique" UNIQUE("period_start","period_end")
);
--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_run_id_payroll_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;