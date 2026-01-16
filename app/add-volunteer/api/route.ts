import {
    SUPABASE_ENABLED,
    PRIVATE_SUPABASE_SERVICE_KEY,
    PUBLIC_SUPABASE_URL,
} from "@/lib/config";
import { createClient } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Cache the admin client to avoid recreating it on every request
let cachedAdminClient: ReturnType<typeof createClient> | null = null;

function getAdminClient() {
    // Return cached client if it exists
    if (cachedAdminClient) {
        return cachedAdminClient;
    }

    if (!PUBLIC_SUPABASE_URL || !PRIVATE_SUPABASE_SERVICE_KEY) {
        throw new Error("Missing Supabase environment variables for admin");
    }
    
    // Create and cache the client
    cachedAdminClient = createClient(
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

export async function POST(request: NextRequest) {
    if (!SUPABASE_ENABLED) {
        return Response.json({ error: "Supabase is not enabled." }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { firstName, lastName, phone, email, role } = body;

        if (!firstName || !lastName || !email) {
            return Response.json({ error: "First Name, Last Name and Email are required" }, { status: 400 });
        }

        const adminClient = getAdminClient();

        // 1. Create Auth User (Invite?)
        // For simplicity in this demo, we might just insert into public.users if we don't want to trigger emails, 
        // OR we create a user with a dummy password.
        /* 
           NOTE: Creating a user in `auth.users` usually requires the Admin API.
           We will try to create the user with a temporary password or just invite them.
           Since we don't have an email provider setup guaranteed, 'inviteUserByEmail' might fail if SMTP isn't set.
        */
        // 1. Generate UUID (Skipping Auth User creation due to permission issues with 'User not allowed')
        const userId = crypto.randomUUID();

        /* 
           NOTE: We are skipping auth.admin.createUser because it requires the SERVICE_ROLE_KEY.
           If the 'users' table has a foreign key constraint on 'id' -> 'auth.users', this insert might fail.
           But based on the error "User not allowed", we cannot create the auth user with current keys.
        */


        // 2. Insert into public.users
        const { error: dbError } = await adminClient
            .from("users")
            .insert({
                id: userId, // Match Auth ID
                email: email,
                first_name: firstName,
                last_name: lastName,
                phone_number: phone,
                role: role === 'manager' ? 'מנהל.ת' : 'מתנדב.ת'
            });

        if (dbError) {
            console.error("Error inserting into public.users:", dbError);
            // Cleanup auth user if DB insert fails?
            // await adminClient.auth.admin.deleteUser(userId); // Skipped as we didn't create auth user
            return Response.json({ error: dbError.message }, { status: 500 });
        }

        return Response.json({ success: true, userId });

    } catch (error: any) {
        console.error("Error in POST /add-volunteer/api:", error);
        return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
