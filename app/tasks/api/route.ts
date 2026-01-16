import {
    SUPABASE_ENABLED,
    PRIVATE_SUPABASE_SERVICE_KEY,
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
} from "@/lib/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { type Database } from "@/lib/supabase/database.types";
import { type NextRequest } from "next/server";

// Initialize database client at module load time to avoid cold start delays
let cachedDatabaseClient: SupabaseClient<Database> | null = null;

function getDatabaseClient() {
    // Return cached client if it exists
    if (cachedDatabaseClient) {
        return cachedDatabaseClient;
    }

    if (!PUBLIC_SUPABASE_URL || !PRIVATE_SUPABASE_SERVICE_KEY) {
        throw new Error("Missing Supabase environment variables");
    }
    
    // Create and cache the client with optimized settings
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

        // Optimize: Batch fetch all needed data instead of N+1 queries
        const tasks = tasksData || [];
        const doneByUserIds = [...new Set(tasks.filter(t => t.done_by).map(t => t.done_by))];
        const participantIds = [...new Set(tasks.filter(t => t.participant_id).map(t => t.participant_id))];
        
        // Batch fetch users
        const usersMap = new Map();
        if (doneByUserIds.length > 0) {
            const { data: usersData } = await databaseClient
                .from("users")
                .select("id, first_name, last_name")
                .in("id", doneByUserIds);
            
            if (usersData) {
                usersData.forEach(user => {
                    usersMap.set(user.id, user);
                });
            }
        }
        
        // Batch fetch participants
        const participantsMap = new Map();
        if (participantIds.length > 0) {
            const { data: participantsData } = await databaseClient
                .from("participants")
                .select("id, phone, full_name")
                .in("id", participantIds);
            
            if (participantsData) {
                participantsData.forEach(participant => {
                    participantsMap.set(participant.id, participant);
                });
            }
        }
        
        // Map data to tasks
        const tasksWithUsers = tasks.map(task => {
            const taskWithData: any = { ...task };
            
            if (task.done_by && usersMap.has(task.done_by)) {
                taskWithData.done_by_user = usersMap.get(task.done_by);
            }
            
            if (task.participant_id && participantsMap.has(task.participant_id)) {
                const participant = participantsMap.get(task.participant_id);
                taskWithData.participant_phone = participant.phone || null;
                taskWithData.participant_name = participant.full_name || null;
            }
            
            return taskWithData;
        });

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
        
        // If task is uncompleted (status changed from 'done' to 'open') and linked to a participant, restore last_phone_call
        if (status === 'open' && participant_id) {
            // First, delete the most recent phone_call activity for this participant (the one created when task was marked as done)
            // Get the most recent activity first
            const { data: recentActivities } = await databaseClient
                .from("user_activities")
                .select("id, created_at")
                .eq("participant_id", participant_id)
                .eq("activity_type", "phone_call")
                .order("created_at", { ascending: false })
                .limit(1);
            
            if (recentActivities && recentActivities.length > 0) {
                // Delete the most recent activity
                const { error: deleteError } = await databaseClient
                    .from("user_activities")
                    .delete()
                    .eq("id", recentActivities[0].id);
                
                if (deleteError) {
                    console.error("Error deleting phone call activity:", deleteError);
                }
            }
            
            // Now find the previous most recent phone call activity (if any)
            const { data: previousActivities } = await databaseClient
                .from("user_activities")
                .select("created_at")
                .eq("participant_id", participant_id)
                .eq("activity_type", "phone_call")
                .order("created_at", { ascending: false })
                .limit(1);
            
            let previousLastPhoneCall: string | null = null;
            
            if (previousActivities && previousActivities.length > 0) {
                // Get the date from the previous most recent activity
                const activityDate = new Date(previousActivities[0].created_at);
                previousLastPhoneCall = activityDate.toISOString().split("T")[0];
            }
            
            // Update participant's last_phone_call to the previous value (or null if no previous calls)
            const { error: participantError } = await databaseClient
                .from("participants")
                .update({ last_phone_call: previousLastPhoneCall })
                .eq("id", participant_id);
            
            if (participantError) {
                console.error("Error restoring participant last_phone_call:", participantError);
            }
        }

        return Response.json({ task: taskData });
    } catch (error) {
        console.error("Error in PATCH /tasks/api:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}
