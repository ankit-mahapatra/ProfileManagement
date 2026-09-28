import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Ensure environment variables are loaded properly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Fallback initialization to prevent route initialization crashes
const supabaseAdmin = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

// GET: Fetch all user profiles and emails
export async function GET() {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in .env.local" },
        { status: 500 }
      );
    }

    // 1. Fetch all profiles from table
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    // 2. Fetch auth users list to map email addresses
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const authUsers = authData?.users || [];
    const emailMap = new Map(authUsers.map((u) => [u.id, u.email]));

    // 3. Combine profiles and mapped auth emails safely
    const combinedData = (profiles || []).map((p) => ({
      ...p,
      email: emailMap.get(p.user_id) || "N/A",
    }));

    return NextResponse.json({ profiles: combinedData }, { status: 200 });
  } catch (err) {
    console.error("GET /api/users Error:", err);
    return NextResponse.json(
      { error: err?.message || "An error occurred while fetching users" },
      { status: 500 }
    );
  }
}

// PUT: Update any profile in Supabase (including avatar & resume URLs)
export async function PUT(request) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { user_id, full_name, phone, location, skills, about, avatar_url, resume_url } = body;

    if (!user_id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name,
        phone,
        location,
        skills,
        about,
        avatar_url,
        resume_url,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user_id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, profile: data && data.length > 0 ? data[0] : null },
      { status: 200 }
    );
  } catch (err) {
    console.error("PUT /api/users Error:", err);
    return NextResponse.json(
      { error: err?.message || "An error occurred while updating user" },
      { status: 500 }
    );
  }
}

// DELETE: Remove user files from Storage, then delete profile and Auth user
export async function DELETE(request) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // -------------------------------------------------------------
    // 1. DELETE USER'S STORAGE FILES (Clean up bucket folder)
    // -------------------------------------------------------------
    // Specify the bucket name you are using (e.g., 'profile-files' or 'avatars' / 'resumes')
    const BUCKET_NAME = "profile-files";

    // List all files in the user's folder
    const { data: fileList, error: listError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list(userId);

    if (!listError && fileList && fileList.length > 0) {
      // Create array of file paths: "userId/filename"
      const filesToRemove = fileList.map((file) => `${userId}/${file.name}`);

      // Delete all files in that user folder
      const { error: deleteStorageError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .remove(filesToRemove);

      if (deleteStorageError) {
        console.error("Storage deletion error:", deleteStorageError.message);
      }
    }

    // -------------------------------------------------------------
    // 2. DELETE PROFILE ROW FROM DATABASE
    // -------------------------------------------------------------
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("user_id", userId);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    // -------------------------------------------------------------
    // 3. PERMANENTLY DELETE USER FROM SUPABASE AUTH
    // -------------------------------------------------------------
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, message: "User profile, files, and Auth account deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE /api/users Error:", err);
    return NextResponse.json(
      { error: err?.message || "An error occurred while deleting user" },
      { status: 500 }
    );
  }
}