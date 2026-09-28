"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function UsersList() {
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchName, setSearchName] = useState("");
  const [filterType, setFilterType] = useState("email");
  const [filterQuery, setFilterQuery] = useState("");

  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({});
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkAuthAndFetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchName, filterType, filterQuery, users]);

  const checkAuthAndFetchUsers = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    await fetchUsers();
  };

  const fetchUsers = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/users");

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (res.ok) {
        setUsers(data.profiles || []);
      } else {
        setMessage(data.error || "Failed to fetch users");
      }
    } catch (err) {
      setMessage(err.message);
    }

    setLoading(false);
  };

  const applyFilters = () => {
    let result = [...users];

    if (searchName.trim() !== "") {
      result = result.filter((u) =>
        (u.full_name || "")
          .toLowerCase()
          .includes(searchName.toLowerCase())
      );
    }

    if (filterQuery.trim() !== "") {
      const query = filterQuery.toLowerCase();

      if (filterType === "email") {
        result = result.filter((u) =>
          (u.email || "").toLowerCase().includes(query)
        );
      } else if (filterType === "location") {
        result = result.filter((u) =>
          (u.location || "").toLowerCase().includes(query)
        );
      } else if (filterType === "phone") {
        result = result.filter((u) =>
          (u.phone || "").toLowerCase().includes(query)
        );
      }
    }

    setFilteredUsers(result);
  };

  // Upload Profile Picture
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];

    if (!file || !editingUser?.user_id) return;

    setUploadingAvatar(true);
    setValidationError("");

    try {
      const userId = editingUser.user_id;

      // Keep one fixed path for the current profile picture
      const fileExt = file.name.split(".").pop().toLowerCase();
      const newFilePath = `${userId}/profile.${fileExt}`;

      // 1. Get existing files
      const {
        data: existingFiles,
        error: listError,
      } = await supabase.storage
        .from("profile-files")
        .list(userId, {
          limit: 100,
        });

      if (listError) {
        throw listError;
      }

      // 2. Upload the new picture first
      const {
        error: uploadError,
      } = await supabase.storage
        .from("profile-files")
        .upload(newFilePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      // 3. Find all old profile pictures
      // This handles:
      // profile.jpg
      // profile.png
      // profile.jpeg
      // profile-123456.jpeg
      // profile-123456.png
      const oldAvatarFiles = (existingFiles || [])
        .filter((f) => {
          return (
            f.id !== null &&
            f.name !== newFilePath.split("/").pop() &&
            /^profile(-|\.)/i.test(f.name)
          );
        })
        .map((f) => `${userId}/${f.name}`);

      // 4. Delete old profile pictures
      if (oldAvatarFiles.length > 0) {
        const {
          error: deleteError,
        } = await supabase.storage
          .from("profile-files")
          .remove(oldAvatarFiles);

        if (deleteError) {
          throw deleteError;
        }
      }

      // 5. Get public URL
      const {
        data: publicUrlData,
      } = supabase.storage
        .from("profile-files")
        .getPublicUrl(newFilePath);

      const freshUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      // 6. Update form data
      setFormData((prev) => ({
        ...prev,
        avatar_url: freshUrl,
      }));
    } catch (err) {
      console.error("Avatar upload error:", err);

      setValidationError(
        "Avatar upload failed: " + err.message
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Upload Resume / CV
  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];

    if (!file || !editingUser?.user_id) return;

    setUploadingResume(true);
    setValidationError("");

    try {
      const userId = editingUser.user_id;

      // Keep one fixed path for the current CV
      const fileExt = file.name.split(".").pop().toLowerCase();
      const newFilePath = `${userId}/cv.${fileExt}`;

      // 1. Get existing files
      const {
        data: existingFiles,
        error: listError,
      } = await supabase.storage
        .from("profile-files")
        .list(userId, {
          limit: 100,
        });

      if (listError) {
        throw listError;
      }

      // 2. Upload new CV first
      const {
        error: uploadError,
      } = await supabase.storage
        .from("profile-files")
        .upload(newFilePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      // 3. Find all old CV files
      // This handles:
      // cv.pdf
      // cv.doc
      // cv.docx
      // cv-123456.pdf
      // cv-123456.docx
      const oldResumeFiles = (existingFiles || [])
        .filter((f) => {
          return (
            f.id !== null &&
            f.name !== newFilePath.split("/").pop() &&
            /^cv(-|\.)/i.test(f.name)
          );
        })
        .map((f) => `${userId}/${f.name}`);

      // 4. Delete old CV files
      if (oldResumeFiles.length > 0) {
        const {
          error: deleteError,
        } = await supabase.storage
          .from("profile-files")
          .remove(oldResumeFiles);

        if (deleteError) {
          throw deleteError;
        }
      }

      // 5. Get public URL
      const {
        data: publicUrlData,
      } = supabase.storage
        .from("profile-files")
        .getPublicUrl(newFilePath);

      const freshUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      // 6. Update form data
      setFormData((prev) => ({
        ...prev,
        resume_url: freshUrl,
      }));
    } catch (err) {
      console.error("Resume upload error:", err);

      setValidationError(
        "Resume upload failed: " + err.message
      );
    } finally {
      setUploadingResume(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({ ...user });
    setValidationError("");
  };

  const handleSaveUpdate = async (e) => {
    e.preventDefault();
    setValidationError("");

    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Update failed");
      }

      setMessage("User updated successfully in Supabase!");
      setEditingUser(null);

      await fetchUsers();
    } catch (err) {
      setValidationError(err.message);
    }
  };

  const handleDelete = async (userId) => {
    if (
      !confirm(
        "Are you sure? This will completely delete the user and their storage files."
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `/api/users?userId=${userId}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Delete failed");
      }

      setMessage(
        "User and associated storage files deleted successfully."
      );

      await fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

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
          }}
        >
          <Link
            href="/dashboard"
            className="save-button"
            style={{
              textDecoration: "none",
            }}
          >
            My Dashboard
          </Link>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
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
              ALL USERS
            </p>

            <h1>User Directory</h1>

            <p>
              Managing Data in this section
            </p>
          </div>
        </div>

        <div
          className="profile-card"
          style={{
            marginBottom: "1.5rem",
          }}
        >
          <div className="profile-grid">
            <div className="form-group">
              <label>
                Search by Name
              </label>

              <input
                type="text"
                placeholder="Type full name..."
                value={searchName}
                onChange={(e) =>
                  setSearchName(e.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label>
                Filter By Field
              </label>

              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType(e.target.value)
                }
                className="custom-select"
              >
                <option value="email">
                  Email
                </option>

                <option value="location">
                  Location
                </option>

                <option value="phone">
                  Phone Number
                </option>
              </select>
            </div>

            <div className="form-group">
              <label>
                Filter Query
              </label>

              <input
                type="text"
                placeholder={`Search by ${filterType}...`}
                value={filterQuery}
                onChange={(e) =>
                  setFilterQuery(e.target.value)
                }
              />
            </div>
          </div>
        </div>

        {message && (
          <div className="success-message">
            {message}
          </div>
        )}

        {loading ? (
          <div className="loading-screen">
            Loading users...
          </div>
        ) : (
          <div className="users-list-container">
            {filteredUsers.length === 0 ? (
              <div className="profile-card">
                No users found matching parameters.
              </div>
            ) : (
              filteredUsers.map((item) => (
                <div
                  key={item.id || item.user_id}
                  className="profile-card"
                  style={{
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    className="user-card-content"
                    style={{
                      display: "flex",
                      gap: "1.5rem",
                      alignItems: "center",
                    }}
                  >
                    {item.avatar_url && (
                      <img
                        src={item.avatar_url}
                        alt="Profile"
                        style={{
                          width: "70px",
                          height: "70px",
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                    )}

                    <div
                      style={{
                        flex: 1,
                      }}
                    >
                      <h2
                        style={{
                          margin: "0 0 0.5rem 0",
                        }}
                      >
                        {item.full_name ||
                          "Unnamed User"}
                      </h2>

                      <p
                        style={{
                          margin: "0.25rem 0",
                          color: "#64748b",
                        }}
                      >
                        <strong>
                          Email:
                        </strong>{" "}
                        {item.email}
                      </p>

                      <p
                        style={{
                          margin: "0.25rem 0",
                          color: "#64748b",
                        }}
                      >
                        <strong>
                          Phone:
                        </strong>{" "}
                        {item.phone || "N/A"}{" "}
                        |{" "}
                        <strong>
                          Location:
                        </strong>{" "}
                        {item.location || "N/A"}
                      </p>

                      <p
                        style={{
                          margin: "0.25rem 0",
                          color: "#64748b",
                        }}
                      >
                        <strong>
                          Skills:
                        </strong>{" "}
                        {item.skills || "N/A"}
                      </p>

                      {item.resume_url && (
                        <p
                          style={{
                            margin: "0.25rem 0",
                          }}
                        >
                          <a
                            href={item.resume_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "#2563eb",
                            }}
                          >
                            📄 View CV / Resume
                          </a>
                        </p>
                      )}
                    </div>

                    <div className="card-actions">
                      <button
                        onClick={() =>
                          handleEdit(item)
                        }
                        className="save-button"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          handleDelete(item.user_id)
                        }
                        className="delete-button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {editingUser && (
          <div className="modal-overlay">
            <div
              className="profile-card modal-card"
              style={{
                maxHeight: "90vh",
                overflowY: "auto",
              }}
            >
              <h2>
                Edit User Profile
              </h2>

              <p
                style={{
                  color: "#64748b",
                  marginBottom: "1rem",
                }}
              >
                User ID: {editingUser.user_id}
              </p>

              {validationError && (
                <p
                  className="message error"
                  style={{
                    color: "red",
                  }}
                >
                  {validationError}
                </p>
              )}

              <form
                onSubmit={handleSaveUpdate}
              >
                {/* Profile Picture */}
                <div
                  className="form-group"
                  style={{
                    marginBottom: "1rem",
                  }}
                >
                  <label>
                    Profile Picture
                  </label>

                  {formData.avatar_url && (
                    <img
                      src={formData.avatar_url}
                      alt="Avatar Preview"
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "50%",
                        display: "block",
                        marginBottom: "0.5rem",
                        objectFit: "cover",
                      }}
                    />
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />

                  {uploadingAvatar && (
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "#64748b",
                      }}
                    >
                      Uploading picture...
                    </p>
                  )}
                </div>

                {/* CV / Resume */}
                <div
                  className="form-group"
                  style={{
                    marginBottom: "1rem",
                  }}
                >
                  <label>
                    CV / Resume Document (PDF / Doc)
                  </label>

                  {formData.resume_url && (
                    <p
                      style={{
                        fontSize: "0.85rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <a
                        href={formData.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#2563eb",
                        }}
                      >
                        Current Resume Attached
                      </a>
                    </p>
                  )}

                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeUpload}
                    disabled={uploadingResume}
                  />

                  {uploadingResume && (
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "#64748b",
                      }}
                    >
                      Uploading CV...
                    </p>
                  )}
                </div>

                {/* Full Name */}
                <div className="form-group">
                  <label>
                    Full Name *
                  </label>

                  <input
                    type="text"
                    value={
                      formData.full_name || ""
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        full_name:
                          e.target.value,
                      })
                    }
                  />
                </div>

                {/* Email */}
                <div className="form-group">
                  <label>
                    Email (Read-Only)
                  </label>

                  <input
                    type="email"
                    value={
                      formData.email || ""
                    }
                    disabled
                  />
                </div>

                {/* Phone */}
                <div className="form-group">
                  <label>
                    Phone Number *
                  </label>

                  <input
                    type="text"
                    value={
                      formData.phone || ""
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phone:
                          e.target.value,
                      })
                    }
                  />
                </div>

                {/* Location */}
                <div className="form-group">
                  <label>
                    Location *
                  </label>

                  <input
                    type="text"
                    value={
                      formData.location || ""
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location:
                          e.target.value,
                      })
                    }
                  />
                </div>

                {/* Skills */}
                <div className="form-group">
                  <label>
                    Skills
                  </label>

                  <input
                    type="text"
                    value={
                      formData.skills || ""
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        skills:
                          e.target.value,
                      })
                    }
                  />
                </div>

                {/* About */}
                <div className="form-group">
                  <label>
                    About
                  </label>

                  <textarea
                    rows="3"
                    value={
                      formData.about || ""
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        about:
                          e.target.value,
                      })
                    }
                  />
                </div>

                {/* Buttons */}
                <div
                  className="modal-actions"
                  style={{
                    marginTop: "1rem",
                    display: "flex",
                    gap: "1rem",
                  }}
                >
                  <button
                    type="submit"
                    className="save-button"
                    disabled={
                      uploadingAvatar ||
                      uploadingResume
                    }
                  >
                    Save Changes
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingUser(null)
                    }
                    className="logout-button"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}