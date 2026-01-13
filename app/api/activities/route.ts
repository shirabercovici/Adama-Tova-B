import {
  SUPABASE_ENABLED,
  PRIVATE_SUPABASE_SERVICE_KEY,
  PUBLIC_SUPABASE_URL,
} from "@/lib/config";
import { createClient as createDatabaseClient } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

// Initialize database client at module load time
let cachedDatabaseClient: ReturnType<typeof createDatabaseClient> | null = null;

function getDatabaseClient() {
  if (cachedDatabaseClient) {
    return cachedDatabaseClient;
  }

  if (!PUBLIC_SUPABASE_URL || !PRIVATE_SUPABASE_SERVICE_KEY) {
    throw new Error("Missing Supabase environment variables");
  }
  
  cachedDatabaseClient = createDatabaseClient(
    PUBLIC_SUPABASE_URL,
    PRIVATE_SUPABASE_SERVICE_KEY,
    {
      db: {
        schema: 'public' as any,
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    } as any
  );
  
  return cachedDatabaseClient;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  if (!SUPABASE_ENABLED) {
    return Response.json({ error: "Supabase is not enabled." }, { status: 500 });
  }

  try {
    const databaseClient = getDatabaseClient();
    const body = await request.json();
    
    const {
      user_id,
      activity_type,
      participant_id,
      participant_name,
      description,
      metadata
    } = body;

    if (!user_id || !activity_type || !description) {
      return Response.json(
        { error: "Missing required fields: user_id, activity_type, description" },
        { status: 400 }
      );
    }

    // Insert activity into user_activities table
    const { data, error } = await databaseClient
      .from("user_activities")
      .insert({
        user_id,
        activity_type,
        participant_id: participant_id || null,
        participant_name: participant_name || null,
        description,
        metadata: metadata ? JSON.stringify(metadata) : null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error logging activity:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ activity: data });
  } catch (error: any) {
    console.error("Error in POST /api/activities:", error);
    return Response.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!SUPABASE_ENABLED) {
    return Response.json({ error: "Supabase is not enabled." }, { status: 500 });
  }

  try {
    const databaseClient = getDatabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const user_id = searchParams.get("user_id");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!user_id) {
      return Response.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    const allActivities: any[] = [];

    // Fetch all activities from user_activities table (attendance, updates, phone calls, status updates, and tasks logged as phone calls)
    const { data: activitiesData, error: activitiesError } = await databaseClient
      .from("user_activities")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!activitiesError && activitiesData) {
      // Parse metadata JSON strings
      activitiesData.forEach((activity: any) => {
        allActivities.push({
          ...activity,
          metadata: activity.metadata ? JSON.parse(activity.metadata as string) : null,
        });
      });
    }

    // Sort all activities by created_at (most recent first)
    allActivities.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    // Limit to requested number
    const limitedActivities = allActivities.slice(0, limit);

    return Response.json({ activities: limitedActivities });
  } catch (error: any) {
    console.error("Error in GET /api/activities:", error);
    return Response.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}
