import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { Layout } from "./components/Layout";
import { ResumeAnalyzer } from "./components/ResumeAnalyzer";
import { AdminDashboard } from "./components/AdminDashboard";
import { FeedbackForm } from "./components/FeedbackForm";
import { LogIn, LogOut, Shield, User as UserIcon, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"admin" | "user" | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"analyzer" | "admin" | "feedback">("analyzer");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Check user role in Firestore
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role);
        } else {
          // Create new user doc
          const newRole = currentUser.email === "ujala.rani21sep@gmail.com" ? "admin" : "user";
          await setDoc(doc(db, "users", currentUser.uid), {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            role: newRole,
            createdAt: serverTimestamp(),
          });
          setRole(newRole);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <Layout>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">
              R
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              AI Resume <span className="text-blue-600">Analyzer</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab("analyzer")}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeTab === "analyzer"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Analyzer
                  </button>
                  {role === "admin" && (
                    <button
                      onClick={() => setActiveTab("admin")}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                        activeTab === "admin"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Admin
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab("feedback")}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeTab === "feedback"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Feedback
                  </button>
                </nav>

                <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold text-slate-900">{user.displayName}</span>
                    <span className="text-xs text-slate-500 capitalize">{role}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                Sign In with Google
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!user ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
                <Shield className="w-4 h-4" />
                Secure & Private Resume Analysis
              </div>
              <h2 className="text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
                Unlock Your Career Potential with <span className="text-blue-600">AI-Powered</span> Insights
              </h2>
              <p className="text-xl text-slate-600 mb-10 leading-relaxed">
                Upload your resume to get instant feedback, skill recommendations, and job role predictions. 
                Our advanced AI analyzes your profile to help you stand out from the crowd.
              </p>
              <button
                onClick={handleLogin}
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 flex items-center gap-3 mx-auto"
              >
                Get Started Now
                <LogIn className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === "analyzer" && (
              <motion.div
                key="analyzer"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <ResumeAnalyzer user={user} />
              </motion.div>
            )}
            {activeTab === "admin" && role === "admin" && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <AdminDashboard />
              </motion.div>
            )}
            {activeTab === "feedback" && (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <FeedbackForm user={user} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} AI Resume Analyzer. Built with 🤍 for Career Growth.
          </p>
        </div>
      </footer>
    </Layout>
  );
}
