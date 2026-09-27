import React from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-bg text-text selection:bg-gold/20 selection:text-gold">
      <Navbar />
      <main className="flex-1 w-full max-w-container mx-auto px-4 sm:px-6 py-6 sm:py-8 page-transition">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
