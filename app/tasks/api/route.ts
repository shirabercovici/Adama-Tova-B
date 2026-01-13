import {
    SUPABASE_ENABLED,
    PRIVATE_SUPABASE_SERVICE_KEY,
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
} from "@/lib/config";
import { createClient as createDatabaseClient } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

// Initialize database client at module load time to avoid cold start delays
let cachedDatabaseClient: ReturnType<typeof createDatabaseClient> | null = null;

function getDatabaseClient() {
    // Return cached client if it exists
    if (cachedDatabaseClient) {
        return cachedDatabaseClient;
    }

    if (!PUBLIC_SUPABASE_URL || !PRIVATE_SUPABASE_SERVICE_KEY) {
        throw new Error("Missing Supabase environment variables");
    }
    
    // Create and cache the client with optimized settings
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
            global: {
                headers: {
                    'x-client-info': 'supabase-js-nextjs',
                },
            },
        } as any
    );
    
    return cachedDatabaseClient;
}

// Note: Client will be created on first request and then cached

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30; // Maximum execution time for the route

export async function GET(request: NextRequest) {
    if (!SUPABASE_ENABLED) {
        return Response.json({ error: "Supabase is not enabled." }, { status: 500 });
    }

    try {
        const databaseClient = getDatabaseClient();

        // Fetch all tasks with user info for done_by
        // Updated to order by due_date
        const { data: tasksData, error } = await databaseClient
            .from("tasks")
            .select("*")
            .order("due_date", { ascending: true });

        if (error) {
            console.error("Error fetching tasks:", error);
            return Response.json({ error: error.message }, { status: 500 });
        }

        // Fetch user info for tasks that have done_by
        const tasksWithUsers = await Promise.all(
            (tasksData || []).map(async (task) => {
                if (task.done_by) {
                    const { data: userData } = await databaseClient
                        .from("users")
                        .select("id, first_name, last_name")
                        .eq("id", task.done_by)
                        .single();
                    
                    return {
                        ...task,
                        done_by_user: userData || null
                    };
                }
                return task;
            })
        );

        return Response.json({ tasks: tasksWithUsers || [] });
    } catch (error) {
        console.error("Error in GET /tasks/api:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    if (!SUPABASE_ENABLED) {
        return Response.json({ error: "Supabase is not enabled." }, { status: 500 });
    }

    try {
        const databaseClient = getDatabaseClient();
        const body = await request.json();
        const { id, status, participant_id, done_by } = body;

        if (!id) {
            return Response.json({ error: "Task ID is required" }, { status: 400 });
        }

        const updates: any = { status };
        if (status === 'done') {
            updates.done_at = new Date().toISOString();
            if (done_by) {
                updates.done_by = done_by;
            }
        } else {
            updates.done_at = null;
            updates.done_by = null;
        }

        // Update task status
        const { data: taskData, error: taskError } = await databaseClient
            .from("tasks")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (taskError) {
            console.error("Error updating task:", taskError);
            return Response.json({ error: taskError.message }, { status: 500 });
        }

        // If task is completed and linked to a participant, update last_phone_call and log activity
        if (status === 'done' && participant_id && done_by) {
            const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

            // Update participant's last_phone_call
            const { error: participantError } = await databaseClient
                .from("participants")
                .update({ last_phone_call: today })
                .eq("id", participant_id);

            if (participantError) {
                console.error("Error updating participant last_phone_call:", participantError);
                // We don't fail the request if this part fails, but we log it.
            }

            // Get participant name for activity log
            const { data: participantData } = await databaseClient
                .from("participants")
                .select("full_name")
                .eq("id", participant_id)
                .single();

            // Log phone call activity (tasks are phone calls)
            if (participantData) {
                await databaseClient
                    .from("user_activities")
                    .insert({
                        user_id: done_by,
                        activity_type: 'phone_call',
                        participant_id: participant_id,
                        participant_name: participantData.full_name,
                        description: `שיחת טלפון ${participantData.full_name}`,
                        created_at: new Date().toISOString(),
                    });
            }
        }

        return Response.json({ task: taskData });
    } catch (error) {
        console.error("Error in PATCH /tasks/api:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}
