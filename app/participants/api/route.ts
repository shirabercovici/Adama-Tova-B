import {
  SUPABASE_ENABLED,
  PRIVATE_SUPABASE_SERVICE_KEY,
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
} from "@/lib/config";
import { createClient as createDatabaseClient } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

function getDatabaseClient() {
  return createDatabaseClient(
    PUBLIC_SUPABASE_URL,
    PRIVATE_SUPABASE_SERVICE_KEY
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface Participant {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  bereavement_circle: string;
  bereavement_detail: string;
  general_notes: string;
  last_attendance: string | null;
  updates: string;
  is_archived: boolean;
  created_at: string;
  last_phone_call: string | null;
}

export async function GET(request: NextRequest) {
  if (!SUPABASE_ENABLED) {
    const missingVars = [];
    if (!PUBLIC_SUPABASE_URL) missingVars.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!PUBLIC_SUPABASE_ANON_KEY) missingVars.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    if (!PRIVATE_SUPABASE_SERVICE_KEY) missingVars.push("PRIVATE_SUPABASE_SERVICE_KEY");
    
    return Response.json({ 
      error: "Supabase is not enabled.",
      details: `Missing environment variables: ${missingVars.join(", ")}`,
      hint: "Please check your .env.local file and ensure all Supabase variables are set."
    }, { status: 500 });
  }

  try {
    const databaseClient = getDatabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const filterArchived = searchParams.get("filterArchived") || "all";
    const filterCircle = searchParams.get("filterCircle") || "all";
    const filterLastAttendance = searchParams.get("filterLastAttendance") || "all";

    let query = databaseClient
      .from("participants")
      .select("*")
      .order("full_name", { ascending: true });

    // Filter by archived status
    if (filterArchived === "active") {
      query = query.eq("is_archived", false);
    } else if (filterArchived === "archived") {
      query = query.eq("is_archived", true);
    }

    // Filter by bereavement circle
    if (filterCircle !== "all" && filterCircle) {
      query = query.eq("bereavement_circle", filterCircle);
    }

    // Filter by last attendance
    if (filterLastAttendance !== "all") {
      // Use UTC date to avoid timezone issues
      const now = new Date();
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      
      if (filterLastAttendance === "today") {
        const todayStr = today.toISOString().split("T")[0];
        query = query.eq("last_attendance", todayStr);
      } else if (filterLastAttendance === "week") {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split("T")[0];
        query = query.gte("last_attendance", weekAgoStr);
      } else if (filterLastAttendance === "month") {
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        const monthAgoStr = monthAgo.toISOString().split("T")[0];
        query = query.gte("last_attendance", monthAgoStr);
      } else if (filterLastAttendance === "never") {
        query = query.is("last_attendance", null);
      }
    }

    // Search filter
    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,bereavement_detail.ilike.%${search}%,general_notes.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching participants:", error);
      return Response.json(
        { 
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        }, 
        { status: 500 }
      );
    }

    return Response.json({ participants: data || [] });
  } catch (error) {
    console.error("Error in GET /participants/api:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!SUPABASE_ENABLED) {
    return Response.json({ error: "Supabase is not enabled." }, { status: 500 });
  }

  try {
    const databaseClient = getDatabaseClient();
    const body = await request.json();
    const { id, last_attendance } = body;

    if (!id) {
      return Response.json({ error: "Participant ID is required" }, { status: 400 });
    }

    const updateData: { last_attendance?: string } = {};
    if (last_attendance !== undefined) {
      updateData.last_attendance = last_attendance;
    }

    const { data, error } = await databaseClient
      .from("participants")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating participant:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ participant: data });
  } catch (error) {
    console.error("Error in PATCH /participants/api:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

