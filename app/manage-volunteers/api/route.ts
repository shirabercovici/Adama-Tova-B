import {
    SUPABASE_ENABLED,
    PRIVATE_SUPABASE_SERVICE_KEY,
    PUBLIC_SUPABASE_URL,
} from "@/lib/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { type Database } from "@/lib/supabase/database.types";
import { type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Cache the admin client to avoid recreating it on every request
let cachedAdminClient: SupabaseClient<Database> | null = null;

function getAdminClient() {
    // Return cached client if it exists
    if (cachedAdminClient) {
        return cachedAdminClient;
    }

    if (!PUBLIC_SUPABASE_URL || !PRIVATE_SUPABASE_SERVICE_KEY) {
        throw new Error("Missing Supabase environment variables for admin");
    }
    
    // Create and cache the client
    cachedAdminClient = createClient<Database>(
        PUBLIC_SUPABASE_URL,
        PRIVATE_SUPABASE_SERVICE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            },
            global: {
                headers: {
                    'x-client-info': 'supabase-js-nextjs',
                },
            },
        }
    );
    
    return cachedAdminClient;
}

export async function GET(request: NextRequest) {
    if (!SUPABASE_ENABLED) {
        return Response.json({ error: "Supabase is not enabled." }, { status: 500 });
    }

    try {
        const adminClient = getAdminClient();

        // Check for specific ID in query params to fetch single user
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (id) {
            const { data: user, error } = await adminClient
                .from("users")
                .select("first_name, last_name, phone_number, email, role")
                .eq("id", id)
                .single();

            if (error) {
                console.error("Error fetching user:", error);
                return Response.json({ error: error.message }, { status: 500 });
            }
            return Response.json({ user });
        }

        // Otherwise fetch all users
        const { data: users, error } = await adminClient
            .from("users")
            .select("*")
            .order("first_name", { ascending: true });

        if (error) {
            console.error("Error fetching users:", error);
            return Response.json({ error: error.message }, { status: 500 });
        }

        return Response.json({ users });

    } catch (error: any) {
        console.error("Error in GET /manage-volunteers/api:", error);
        return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    if (!SUPABASE_ENABLED) {
        return Response.json({ error: "Supabase is not enabled." }, { status: 500 });
    }

    try {
        const adminClient = getAdminClient();
        const body = await request.json();
        const { id, firstName, lastName, phone, email, role } = body;

        if (!id) {
            return Response.json({ error: "User ID is required" }, { status: 400 });
        }

        const updates = {
            first_name: firstName,
            last_name: lastName,
            phone_number: phone,
            email: email,
            role: role === 'manager' ? 'מנהל.ת' : 'מתנדב.ת'
        };

        const { error } = await adminClient
            .from("users")
            .update(updates)
            .eq("id", id);

        if (error) {
            console.error("Error updating user:", error);
            return Response.json({ error: error.message }, { status: 500 });
        }

        return Response.json({ success: true });
    } catch (error: any) {
        console.error("Error in PUT /manage-volunteers/api:", error);
        return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    if (!SUPABASE_ENABLED) {
        return Response.json({ error: "Supabase is not enabled." }, { status: 500 });
    }

    try {
        const adminClient = getAdminClient();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return Response.json({ error: "User ID is required" }, { status: 400 });
        }

        // Delete from public.users
        const { error } = await adminClient
            .from("users")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Error deleting user from DB:", error);
            return Response.json({ error: error.message }, { status: 500 });
        }

        // Optionally delete from auth.users via admin API if it was created there
        // But since we are using random UUIDs now for manual creation, auth delete might fail or be irrelevant
        // pass for now

        return Response.json({ success: true });

    } catch (error: any) {
        console.error("Error in DELETE /manage-volunteers/api:", error);
        return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
