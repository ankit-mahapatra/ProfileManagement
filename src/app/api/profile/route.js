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


// =====================================
// GET FILE PATH FROM PUBLIC URL
// =====================================

function getFilePath(url) {
  if (!url) {
    return null;
  }

  const marker =
    "/storage/v1/object/public/profile-files/";

  const cleanUrl = url.split("?")[0];

  const index = cleanUrl.indexOf(marker);

  if (index === -1) {
    return null;
  }

  return cleanUrl.substring(index + marker.length);
}


// =====================================
// DELETE OLD PROFILE FILES
// =====================================

async function deleteOldFiles(supabase, userId, type, currentFileName) {
  try {
    const { data: files, error: listError } =
      await supabase.storage
        .from("profile-files")
        .list(userId, {
          limit: 1000,
          offset: 0,
        });

    if (listError) {
      console.error(
        `Error listing old ${type} files:`,
        listError
      );

      return;
    }

    if (!files || files.length === 0) {
      return;
    }

    let pattern;

    if (type === "profile") {
      pattern = /^profile(-|\.)/i;
    } else {
      pattern = /^cv(-|\.)/i;
    }

    const filesToDelete = files
      .filter((file) => {
        return (
          pattern.test(file.name) &&
          file.name !== currentFileName
        );
      })
      .map((file) => `${userId}/${file.name}`);

    if (filesToDelete.length === 0) {
      return;
    }

    console.log(
      `Deleting old ${type} files:`,
      filesToDelete
    );

    const { error: deleteError } =
      await supabase.storage
        .from("profile-files")
        .remove(filesToDelete);

    if (deleteError) {
      console.error(
        `Error deleting old ${type} files:`,
        deleteError
      );
    } else {
      console.log(
        `Old ${type} files deleted successfully`
      );
    }
  } catch (error) {
    console.error(
      `DELETE OLD ${type.toUpperCase()} FILES ERROR:`,
      error
    );
  }
}


// =====================================
// GET PROFILE
// =====================================

export async function GET(request) {
  try {
    const auth = await getAuth(request);

    if (!auth) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
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
        {
          error: profileError.message,
        },
        {
          status: 400,
        }
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
          avatar_url: null,
          resume_url: null,
        })
        .select()
        .single();

      if (createError) {
        console.error(
          "Profile creation error:",
          createError
        );

        return NextResponse.json(
          {
            error: createError.message,
          },
          {
            status: 400,
          }
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
      {
        error: error.message,
      },
      {
        status: 500,
      }
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
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const { user, supabase } = auth;

    console.log("User:", user.id);

    const formData = await request.formData();

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
      profileImage?.name || "No new image"
    );

    console.log(
      "CV:",
      cvFile?.name || "No new CV"
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
        {
          error: profileError.message,
        },
        {
          status: 400,
        }
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
          avatar_url: null,
          resume_url: null,
        })
        .select()
        .single();

      if (createError) {
        console.error(
          "Profile creation error:",
          createError
        );

        return NextResponse.json(
          {
            error: createError.message,
          },
          {
            status: 400,
          }
        );
      }

      oldProfile = newProfile;

      console.log(
        "New profile created:",
        oldProfile.user_id
      );
    }


    // =====================================
    // OLD URL VALUES
    // =====================================

    let imageUrl =
      oldProfile.avatar_url || null;

    let resumeUrl =
      oldProfile.resume_url || null;


    // =====================================
    // UPLOAD NEW PROFILE IMAGE
    // =====================================

    if (
      profileImage &&
      typeof profileImage !== "string" &&
      profileImage.size > 0
    ) {
      const extension =
        profileImage.name
          .split(".")
          .pop()
          .toLowerCase();

      const filePath =
        `${user.id}/profile.${extension}`;

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
            contentType:
              profileImage.type,
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
          {
            status: 400,
          }
        );
      }

      const {
        data: publicData,
      } = supabase.storage
        .from("profile-files")
        .getPublicUrl(filePath);

      imageUrl =
        `${publicData.publicUrl}?v=${Date.now()}`;

      console.log(
        "New image URL:",
        imageUrl
      );


      // Delete old profile images
      await deleteOldFiles(
        supabase,
        user.id,
        "profile",
        `profile.${extension}`
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
      const extension =
        cvFile.name
          .split(".")
          .pop()
          .toLowerCase();

      const filePath =
        `${user.id}/cv.${extension}`;

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
            contentType:
              cvFile.type,
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
          {
            status: 400,
          }
        );
      }

      const {
        data: publicData,
      } = supabase.storage
        .from("profile-files")
        .getPublicUrl(filePath);

      resumeUrl =
        `${publicData.publicUrl}?v=${Date.now()}`;

      console.log(
        "New CV URL:",
        resumeUrl
      );


      // Delete old CV files
      await deleteOldFiles(
        supabase,
        user.id,
        "cv",
        `cv.${extension}`
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
        avatar_url: imageUrl,
        resume_url: resumeUrl,
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
        {
          status: 400,
        }
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
        {
          status: 400,
        }
      );
    }

    console.log(
      "Database updated successfully:",
      updatedProfile
    );


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
      {
        status: 500,
      }
    );
  }
}