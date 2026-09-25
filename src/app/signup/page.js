"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Signup() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: data.user.id,
          full_name: fullName,
        });

      if (profileError) {
        setMessage(profileError.message);
        setLoading(false);
        return;
      }
    }

    setMessage("Account created successfully!");

    setTimeout(() => {
      router.push("/dashboard");
    }, 1000);
  };

  return (
    <main className="auth-page">
      <div className="auth-card">

        <div className="logo">
          Profile<span>Manager</span>
        </div>

        <h1>Create Account</h1>

        <p className="auth-subtitle">
          Create your profile and manage your professional information.
        </p>

        <form onSubmit={handleSignup}>

          <label>Full Name</label>

          <input
            type="text"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <label>Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

        </form>

        {message && (
          <p className="message">
            {message}
          </p>
        )}

        <p className="switch-text">
          Already have an account?{" "}
          <Link href="/login">Login</Link>
        </p>

      </div>
    </main>
  );
}