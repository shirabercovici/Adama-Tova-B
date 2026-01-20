import {
  SUPABASE_ENABLED,
  PRIVATE_SUPABASE_SERVICE_KEY,
  PUBLIC_SUPABASE_URL,
} from "@/lib/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { type Database } from "@/lib/supabase/database.types";
import { type NextRequest } from "next/server";

// Initialize database client at module load time
let cachedDatabaseClient: SupabaseClient<Database> | null = null;

function getDatabaseClient() {
  if (cachedDatabaseClient) {
    return cachedDatabaseClient;
  }

  if (!PUBLIC_SUPABASE_URL || !PRIVATE_SUPABASE_SERVICE_KEY) {
    throw new Error("Missing Supabase environment variables");
  }

  cachedDatabaseClient = createClient<Database>(
    PUBLIC_SUPABASE_URL,
    PRIVATE_SUPABASE_SERVICE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'x-client-info': 'supabase-js-nextjs',
        },
      },
    }
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
      metadata,
      activity_id,
      is_read,
      update_content,
      is_public
    } = body;

    // If activity_id and is_read are provided, update the read status
    if (activity_id && is_read !== undefined) {
      const updateData: any = {
        is_read: is_read === true
      };

      const { data, error } = await databaseClient
        .from("user_activities")
        .update(updateData)
        .eq("id", activity_id)
        .select()
        .single();

      if (error) {
        console.error("Error updating read status:", error);
        return Response.json({ error: error.message }, { status: 500 });
      }

      return Response.json({ activity: data });
    }

    // Otherwise, insert new activity
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
        update_content: update_content || null,
        is_public: is_public !== undefined ? is_public : true, // Default to true if not specified
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
    const activity_type = searchParams.get("activity_type");
    const participant_id = searchParams.get("participant_id");
    const limit = parseInt(searchParams.get("limit") || "50");

    // If participant_id is specified, fetch activities for that participant
    if (participant_id) {
      let query = databaseClient
        .from("user_activities")
        .select("*")
        .eq("participant_id", participant_id);

      if (activity_type) {
        query = query.eq("activity_type", activity_type);
      }

      const { data: activitiesData, error: activitiesError } = await query
        .order("created_at", { ascending: false })
        .limit(limit);

      if (activitiesError) {
        console.error("Error fetching activities:", activitiesError);
        return Response.json(
          { error: "Failed to fetch activities", details: activitiesError.message },
          { status: 500 }
        );
      }

      // Fetch user names separately
      const userIds = Array.from(new Set((activitiesData || []).map((a: any) => a.user_id).filter(Boolean)));
      const usersMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await databaseClient
          .from("users")
          .select("id, first_name, last_name, role")
          .in("id", userIds);

        if (!usersError && usersData) {
          usersData.forEach((user: any) => {
            usersMap[user.id] = user;
          });
        }
      }

      // Parse metadata JSON strings and attach user info
      const activities = (activitiesData || []).map((activity: any) => {
        const user = usersMap[activity.user_id];
        const firstName = user?.first_name || '';
        const userRole = user?.role || '';
        const userDisplayName = firstName ? `${firstName}` : ''; // Keep it simple like Profile

        return {
          ...activity,
          metadata: activity.metadata ? JSON.parse(activity.metadata as string) : null,
          user_name: firstName,
          user_display_name: userDisplayName,
          user_role: userRole
        };
      });

      return Response.json({ activities });
    }

    // If activity_type is specified without user_id, fetch all activities of that type
    // This is useful for managers to see all status updates
    if (activity_type && !user_id) {
      // Fetch all status_update activities first
      let query = databaseClient
        .from("user_activities")
        .select("*")
        .eq("activity_type", activity_type)
        .order("created_at", { ascending: false })
        .limit(limit);

      const { data: activitiesData, error: activitiesError } = await query;

      if (activitiesError) {
        console.error("Error fetching activities:", activitiesError);
        return Response.json(
          { error: "Failed to fetch activities", details: activitiesError.message },
          { status: 500 }
        );
      }

      // Filter out activities without update_content (IS NOT NULL check)
      const filteredActivities = (activitiesData || []).filter((activity: any) => {
        if (activity_type === 'status_update') {
          // Check if update_content exists and is not empty (IS NOT NULL)
          return activity.update_content &&
            (typeof activity.update_content === 'string' ? activity.update_content.trim() !== '' : activity.update_content !== null);
        }
        return true;
      });

      // Fetch user names separately (more reliable than join)
      const userIds = Array.from(new Set(filteredActivities.map((a: any) => a.user_id).filter(Boolean)));
      const usersMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await databaseClient
          .from("users")
          .select("id, first_name, last_name, role")
          .in("id", userIds);

        if (!usersError && usersData) {
          usersData.forEach((user: any) => {
            usersMap[user.id] = user;
          });
        }
      }

      // Format user info (only if activities exist)
      const activities = filteredActivities.map((activity: any) => {
        const user = usersMap[activity.user_id];
        const firstName = user?.first_name || '';
        const userRole = user?.role || '';
        const userDisplayName = firstName ? `${firstName} ${userRole}` : '';

        // Use update_content directly from the field (it exists in the table)
        const updateContent = activity.update_content;

        // Return the activity with all fields
        return {
          id: activity.id,
          activity_type: activity.activity_type,
          participant_name: activity.participant_name,
          participant_id: activity.participant_id,
          update_content: updateContent, // This is the message content from update_content field
          created_at: activity.created_at,
          is_public: activity.is_public,
          is_read: activity.is_read || false,
          user_id: activity.user_id,
          user_name: firstName,
          user_role: userRole,
          user_display_name: userDisplayName,
        };
      });

      return Response.json({ activities });
    }

    if (!user_id) {
      return Response.json(
        { error: "user_id is required when activity_type is not specified" },
        { status: 400 }
      );
    }

    // Fetch all activities from user_activities table (attendance, updates, phone calls, status updates, and tasks logged as phone calls)
    // Database already orders and limits, so we just need to parse metadata
    let query = databaseClient
      .from("user_activities")
      .select("*")
      .eq("user_id", user_id);

    if (activity_type) {
      query = query.eq("activity_type", activity_type);
    }

    const { data: activitiesData, error: activitiesError } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (activitiesError) {
      console.error("Error fetching activities:", activitiesError);
      return Response.json(
        { error: "Failed to fetch activities", details: activitiesError.message },
        { status: 500 }
      );
    }

    // Parse metadata JSON strings (only if activities exist)
    const activities = (activitiesData || []).map((activity: any) => ({
      ...activity,
      metadata: activity.metadata ? JSON.parse(activity.metadata as string) : null,
    }));

    return Response.json({ activities });
  } catch (error: any) {
    console.error("Error in GET /api/activities:", error);
    return Response.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}
