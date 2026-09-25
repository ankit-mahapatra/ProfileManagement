"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="home-page">

      <nav className="navbar home-navbar">

        <div className="logo">
          Profile<span>Manager</span>
        </div>

        <div className="nav-links">
          <Link href="/login">
            Login
          </Link>

          <Link
            href="/signup"
            className="nav-signup"
          >
            Get Started
          </Link>
        </div>

      </nav>

      <section className="hero">

        <div className="hero-content">

          <div className="badge">
            Your Professional Profile
          </div>

          <h1>
            Build your profile.
            <br />
            <span>Show your work.</span>
          </h1>

          <p>
            Manage your personal information, skills,
            profile photo and CV from one simple dashboard.
          </p>

          <div className="hero-buttons">

            <Link
              href="/signup"
              className="hero-button"
            >
              Create Your Profile
            </Link>

            <Link
              href="/login"
              className="secondary-button"
            >
              Login
            </Link>

          </div>

        </div>

      </section>

    </main>
  );
}