import {
  SUPABASE_ENABLED,
  PRIVATE_SUPABASE_SERVICE_KEY,
  PUBLIC_SUPABASE_URL,
} from "@/lib/config";
import { createClient as createDatabaseClient } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { makeTeamDistribution } from "../../logic";
import type {
  Group,
  PromptCompany,
  PromptIdea,
  Student,
  Team,
} from "../../types";

function getDatabaseClient() {
  return createDatabaseClient(
    PUBLIC_SUPABASE_URL,
    PRIVATE_SUPABASE_SERVICE_KEY
  );
}

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  if (!SUPABASE_ENABLED)
    return Response.json({ error: "Supabase is not enabled." });
  const databaseClient = getDatabaseClient();
  const { data: students } = (await databaseClient
    .from("student")
    .select(`id, name, group (id, name)`)) as { data: Student[] };
  const { data: groups } = (await databaseClient
    .from("group")
    .select(`id, name`)) as { data: Group[] };
  const { data: prompt_companies } = (await databaseClient
    .from("prompt_company")
    .select(`id, name`)) as { data: PromptCompany[] };
  const { data: prompt_ideas } = (await databaseClient
    .from("prompt_idea")
    .select(`id, description`)) as { data: PromptIdea[] };

  const developerCount = students.filter((s) => {
    return s.group.id === 1;
  }).length;
  const designerCount = students.filter((s) => {
    return s.group.id === 2;
  }).length;
  const distribution = makeTeamDistribution(developerCount, designerCount);
  const teams = [] as Team[];
  const response = {
    groups,
    students,
    teams,
    distribution,
    prompt_companies,
    prompt_ideas,
  };
  return Response.json(response);
}
