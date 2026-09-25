import "./globals.css";

export const metadata = {
  title: "Profile Manager",
  description: "Manage your professional profile",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}