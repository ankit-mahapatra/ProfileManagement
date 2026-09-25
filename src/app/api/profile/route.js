import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createSupabaseClient(token) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
}

async function getAuth(request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return null;
  }

  const supabase = createSupabaseClient(token);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.log("Auth error:", error);
    return null;
  }

  return {
    user,
    supabase,
  };
}

function getFilePath(url) {
  if (!url) {
    return null;
  }

  const marker =
    "/storage/v1/object/public/profile-files/";

  const index = url.indexOf(marker);

  if (index === -1) {
    return null;
  }

  return url.substring(index + marker.length);
}

// =====================================
// GET PROFILE
// =====================================

export async function GET(request) {
  try {
    const auth = await getAuth(request);

    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { user, supabase } = auth;

    console.log("GET PROFILE USER:", user.id);

    const {
      data: profiles,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id);

    if (profileError) {
      console.error(
        "Profile fetch error:",
        profileError
      );

      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }

    let profile = profiles?.[0] || null;

    // =====================================
    // CREATE PROFILE IF IT DOES NOT EXIST
    // =====================================

    if (!profile) {
      console.log(
        "Profile does not exist. Creating profile..."
      );

      const {
        data: newProfile,
        error: createError,
      } = await supabase
        .from("profiles")
        .insert({
          user_id: user.id,
          full_name: "",
          phone: "",
          location: "",
          skills: "",
          about: "",
          profile_image: null,
          cv_url: null,
        })
        .select()
        .single();

      if (createError) {
        console.error(
          "Profile creation error:",
          createError
        );

        return NextResponse.json(
          { error: createError.message },
          { status: 400 }
        );
      }

      profile = newProfile;

      console.log(
        "Profile created successfully"
      );
    }

    return NextResponse.json({
      user,
      profile,
    });
  } catch (error) {
    console.error(
      "GET PROFILE ERROR:",
      error
    );

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// =====================================
// UPDATE PROFILE
// =====================================

export async function PUT(request) {
  try {
    console.log(
      "PUT /api/profile started"
    );

    const auth = await getAuth(request);

    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { user, supabase } = auth;

    console.log(
      "User:",
      user.id
    );

    const formData =
      await request.formData();

    const fullName =
      formData.get("fullName") || "";

    const phone =
      formData.get("phone") || "";

    const location =
      formData.get("location") || "";

    const skills =
      formData.get("skills") || "";

    const about =
      formData.get("about") || "";

    const profileImage =
      formData.get("profileImage");

    const cvFile =
      formData.get("cvFile");

    console.log(
      "Profile image:",
      profileImage?.name ||
        "No new image"
    );

    console.log(
      "CV:",
      cvFile?.name ||
        "No new CV"
    );

    // =====================================
    // GET OLD PROFILE
    // =====================================

    const {
      data: profiles,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id);

    if (profileError) {
      console.error(
        "Profile fetch error:",
        profileError
      );

      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }

    let oldProfile =
      profiles?.[0] || null;

    // =====================================
    // CREATE PROFILE IF IT DOES NOT EXIST
    // =====================================

    if (!oldProfile) {
      console.log(
        "Profile does not exist. Creating profile..."
      );

      const {
        data: newProfile,
        error: createError,
      } = await supabase
        .from("profiles")
        .insert({
          user_id: user.id,
          full_name: fullName,
          phone: phone,
          location: location,
          skills: skills,
          about: about,
          profile_image: null,
          cv_url: null,
        })
        .select()
        .single();

      if (createError) {
        console.error(
          "Profile creation error:",
          createError
        );

        return NextResponse.json(
          { error: createError.message },
          { status: 400 }
        );
      }

      oldProfile = newProfile;

      console.log(
        "New profile created:",
        oldProfile.user_id
      );
    }

    console.log(
      "Old profile found:",
      oldProfile.user_id
    );

    // =====================================
    // OLD FILE INFORMATION
    // =====================================

    let imageUrl =
      oldProfile.profile_image || null;

    let cvUrl =
      oldProfile.cv_url || null;

    let oldImagePath = null;

    let oldCvPath = null;

    // =====================================
    // UPLOAD NEW PROFILE IMAGE
    // =====================================

    if (
      profileImage &&
      typeof profileImage !== "string" &&
      profileImage.size > 0
    ) {
      oldImagePath =
        getFilePath(
          oldProfile.profile_image
        );

      const extension =
        profileImage.name
          .split(".")
          .pop();

      const filePath =
        `${user.id}/profile-${Date.now()}.${extension}`;

      console.log(
        "Uploading image:",
        filePath
      );

      const {
        error: uploadError,
      } = await supabase.storage
        .from("profile-files")
        .upload(
          filePath,
          profileImage,
          {
            upsert: true,
          }
        );

      if (uploadError) {
        console.error(
          "Image upload error:",
          uploadError
        );

        return NextResponse.json(
          {
            error:
              uploadError.message,
          },
          { status: 400 }
        );
      }

      const {
        data: publicData,
      } = supabase.storage
        .from("profile-files")
        .getPublicUrl(filePath);

      imageUrl =
        publicData.publicUrl;

      console.log(
        "New image URL:",
        imageUrl
      );
    }

    // =====================================
    // UPLOAD NEW CV
    // =====================================

    if (
      cvFile &&
      typeof cvFile !== "string" &&
      cvFile.size > 0
    ) {
      oldCvPath =
        getFilePath(
          oldProfile.cv_url
        );

      const extension =
        cvFile.name
          .split(".")
          .pop();

      const filePath =
        `${user.id}/cv-${Date.now()}.${extension}`;

      console.log(
        "Uploading CV:",
        filePath
      );

      const {
        error: uploadError,
      } = await supabase.storage
        .from("profile-files")
        .upload(
          filePath,
          cvFile,
          {
            upsert: true,
          }
        );

      if (uploadError) {
        console.error(
          "CV upload error:",
          uploadError
        );

        return NextResponse.json(
          {
            error:
              uploadError.message,
          },
          { status: 400 }
        );
      }

      const {
        data: publicData,
      } = supabase.storage
        .from("profile-files")
        .getPublicUrl(filePath);

      cvUrl =
        publicData.publicUrl;

      console.log(
        "New CV URL:",
        cvUrl
      );
    }

    // =====================================
    // UPDATE DATABASE
    // =====================================

    const {
      data: updatedProfiles,
      error: updateError,
    } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone,
        location: location,
        skills: skills,
        about: about,
        profile_image: imageUrl,
        cv_url: cvUrl,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "user_id",
        user.id
      )
      .select("*");

    if (updateError) {
      console.error(
        "Database update error:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            updateError.message,
        },
        { status: 400 }
      );
    }

    const updatedProfile =
      updatedProfiles?.[0] || null;

    if (!updatedProfile) {
      return NextResponse.json(
        {
          error:
            "Profile was not updated.",
        },
        { status: 400 }
      );
    }

    console.log(
      "Database updated successfully"
    );

    // =====================================
    // DELETE OLD IMAGE
    // =====================================

    if (
      oldImagePath &&
      profileImage &&
      typeof profileImage !== "string" &&
      profileImage.size > 0
    ) {
      console.log(
        "Deleting old image:",
        oldImagePath
      );

      const {
        error: deleteError,
      } = await supabase.storage
        .from("profile-files")
        .remove([
          oldImagePath,
        ]);

      if (deleteError) {
        console.error(
          "Old image delete error:",
          deleteError
        );
      } else {
        console.log(
          "Old image deleted successfully"
        );
      }
    }

    // =====================================
    // DELETE OLD CV
    // =====================================

    if (
      oldCvPath &&
      cvFile &&
      typeof cvFile !== "string" &&
      cvFile.size > 0
    ) {
      console.log(
        "Deleting old CV:",
        oldCvPath
      );

      const {
        error: deleteError,
      } = await supabase.storage
        .from("profile-files")
        .remove([
          oldCvPath,
        ]);

      if (deleteError) {
        console.error(
          "Old CV delete error:",
          deleteError
        );
      } else {
        console.log(
          "Old CV deleted successfully"
        );
      }
    }

    // =====================================
    // SUCCESS RESPONSE
    // =====================================

    console.log(
      "Profile update completed"
    );

    return NextResponse.json({
      success: true,
      message:
        "Profile updated successfully",
      profile:
        updatedProfile,
    });
  } catch (error) {
    console.error(
      "PUT PROFILE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}