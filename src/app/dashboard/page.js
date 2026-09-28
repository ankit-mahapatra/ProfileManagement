"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Dashboard() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState("");
  const [about, setAbout] = useState("");

  const [profileImage, setProfileImage] = useState(null);
  const [cvFile, setCvFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkUser();
  }, []);


  // =====================================
  // CHECK USER
  // =====================================

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setUser(user);

    await getProfile();

    setLoading(false);
  };


  // =====================================
  // GET PROFILE
  // =====================================

  const getProfile = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const response = await fetch(
        "/api/profile",
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
        }
      );

      console.log(
        "API status:",
        response.status
      );

      console.log(
        "API content type:",
        response.headers.get(
          "content-type"
        )
      );

      const text =
        await response.text();

      console.log(
        "API response:",
        text
      );

      if (!text) {
        setMessage(
          "API returned an empty response."
        );
        return;
      }

      const result =
        JSON.parse(text);

      if (!response.ok) {
        setMessage(
          result.error ||
          "Something went wrong"
        );
        return;
      }

      const data =
        result.profile;

      if (!data) {
        setMessage(
          "Profile data not found."
        );
        return;
      }

      setProfile(data);

      setFullName(
        data.full_name || ""
      );

      setPhone(
        data.phone || ""
      );

      setLocation(
        data.location || ""
      );

      setSkills(
        data.skills || ""
      );

      setAbout(
        data.about || ""
      );

    } catch (error) {
      console.error(
        "GET PROFILE ERROR:",
        error
      );

      setMessage(
        error.message
      );
    }
  };


  // =====================================
  // SAVE PROFILE
  // =====================================

  const handleSave = async (e) => {
    e.preventDefault();

    if (!user) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const formData =
        new FormData();

      formData.append(
        "fullName",
        fullName
      );

      formData.append(
        "phone",
        phone
      );

      formData.append(
        "location",
        location
      );

      formData.append(
        "skills",
        skills
      );

      formData.append(
        "about",
        about
      );

      if (profileImage) {
        formData.append(
          "profileImage",
          profileImage
        );
      }

      if (cvFile) {
        formData.append(
          "cvFile",
          cvFile
        );
      }

      const response =
        await fetch(
          "/api/profile",
          {
            method: "PUT",
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
            body: formData,
          }
        );

      const text =
        await response.text();

      console.log(
        "PUT API status:",
        response.status
      );

      console.log(
        "PUT API response:",
        text
      );

      if (!text) {
        throw new Error(
          "API returned an empty response."
        );
      }

      const result =
        JSON.parse(text);

      if (!response.ok) {
        throw new Error(
          result.error ||
          "Something went wrong"
        );
      }

      setMessage(
        "Profile updated successfully!"
      );

      setProfileImage(null);
      setCvFile(null);

      await getProfile();

    } catch (error) {
      console.error(
        "SAVE PROFILE ERROR:",
        error
      );

      setMessage(
        error.message
      );
    }

    setSaving(false);
  };


  // =====================================
  // LOGOUT
  // =====================================

  const handleLogout = async () => {
    await supabase.auth.signOut();

    router.push("/login");
  };


  // =====================================
  // LOADING
  // =====================================

  if (loading) {
    return (
      <div className="loading-screen">
        Loading...
      </div>
    );
  }


  // =====================================
  // DASHBOARD
  // =====================================

  return (
    <main className="dashboard-page">

      <nav className="navbar">

        <div className="logo">
          Profile<span>Manager</span>
        </div>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
          }}
        >

          <Link
            href="/users"
            style={{
              color: "#6366f1",
              fontWeight: "600",
              textDecoration: "none",
            }}
          >
            View All Users
          </Link>

          <button
            onClick={handleLogout}
            className="logout-button"
          >
            Logout
          </button>

        </div>

      </nav>


      <section className="dashboard-container">

        <div className="dashboard-header">

          <div>

            <p className="small-heading">
              YOUR DASHBOARD
            </p>

            <h1>
              Manage Your Profile
            </h1>

            <p>
              Keep your professional
              information updated.
            </p>

          </div>

        </div>


        <div className="profile-card">

          <div className="profile-heading">

            <div>

              <h2>
                Personal Information
              </h2>

              <p>
                Update your profile
                details below.
              </p>

            </div>

          </div>


          <form onSubmit={handleSave}>

            <div className="profile-grid">

              <div className="form-group">

                <label>
                  Full Name
                </label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(
                      e.target.value
                    )
                  }
                  placeholder="Your full name"
                />

              </div>


              <div className="form-group">

                <label>
                  Email
                </label>

                <input
                  type="email"
                  value={
                    user?.email || ""
                  }
                  disabled
                />

              </div>


              <div className="form-group">

                <label>
                  Phone
                </label>

                <input
                  type="text"
                  value={phone}
                  onChange={(e) =>
                    setPhone(
                      e.target.value
                    )
                  }
                  placeholder="Your phone number"
                />

              </div>


              <div className="form-group">

                <label>
                  Location
                </label>

                <input
                  type="text"
                  value={location}
                  onChange={(e) =>
                    setLocation(
                      e.target.value
                    )
                  }
                  placeholder="Your location"
                />

              </div>

            </div>


            <div className="form-group">

              <label>
                Skills
              </label>

              <input
                type="text"
                value={skills}
                onChange={(e) =>
                  setSkills(
                    e.target.value
                  )
                }
                placeholder="React, Next.js, JavaScript, SQL..."
              />

            </div>


            <div className="form-group">

              <label>
                About You
              </label>

              <textarea
                value={about}
                onChange={(e) =>
                  setAbout(
                    e.target.value
                  )
                }
                placeholder="Tell something about yourself..."
                rows="5"
              />

            </div>


            <div className="upload-section">


              {/* PROFILE PHOTO */}

              <div className="upload-box">

                <h3>
                  Profile Photo
                </h3>

                <p>
                  Upload JPG, JPEG or PNG
                </p>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={(e) =>
                    setProfileImage(
                      e.target.files?.[0] || null
                    )
                  }
                />


                {profile?.avatar_url && (
                  <img
                    src={
                      profile.avatar_url
                    }
                    alt="Profile"
                    className="profile-preview"
                  />
                )}

              </div>


              {/* CV */}

              <div className="upload-box">

                <h3>
                  CV / Resume
                </h3>

                <p>
                  Upload your PDF resume
                </p>

                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) =>
                    setCvFile(
                      e.target.files?.[0] || null
                    )
                  }
                />


                {profile?.resume_url && (
                  <a
                    href={
                      profile.resume_url
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cv-link"
                  >
                    View Current CV
                  </a>
                )}

              </div>

            </div>


            <button
              type="submit"
              className="save-button"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save Profile"}
            </button>

          </form>


          {message && (
            <div className="success-message">
              {message}
            </div>
          )}

        </div>

      </section>

    </main>
  );
}