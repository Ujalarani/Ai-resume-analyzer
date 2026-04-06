import React, { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Users, FileText, Star, TrendingUp, Download, Loader2 } from "lucide-react";
import { motion } from "motion/react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAnalyses: 0,
    avgRating: 0,
    roleData: [] as any[],
    ratingData: [] as any[],
    recentAnalyses: [] as any[],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const analysesSnap = await getDocs(collection(db, "analyses"));
        const feedbacksSnap = await getDocs(collection(db, "feedbacks"));

        const analyses = analysesSnap.docs.map(doc => doc.data());
        const feedbacks = feedbacksSnap.docs.map(doc => doc.data());

        // Role distribution
        const roleCounts: Record<string, number> = {};
        analyses.forEach(a => {
          roleCounts[a.predictedRole] = (roleCounts[a.predictedRole] || 0) + 1;
        });
        const roleData = Object.entries(roleCounts).map(([name, value]) => ({ name, value }));

        // Rating distribution
        const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let totalRating = 0;
        feedbacks.forEach(f => {
          ratingCounts[f.rating] = (ratingCounts[f.rating] || 0) + 1;
          totalRating += f.rating;
        });
        const ratingData = Object.entries(ratingCounts).map(([name, value]) => ({ name: `${name} Star`, value }));
        const avgRating = feedbacks.length > 0 ? (totalRating / feedbacks.length).toFixed(1) : 0;

        // Recent analyses
        const recentAnalyses = analysesSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a: any, b: any) => b.timestamp?.toMillis() - a.timestamp?.toMillis())
          .slice(0, 5);

        setStats({
          totalUsers: usersSnap.size,
          totalAnalyses: analysesSnap.size,
          avgRating: Number(avgRating),
          roleData,
          ratingData,
          recentAnalyses,
        });
      } catch (error) {
        console.error("Dashboard Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const downloadCSV = () => {
    const headers = ["ID", "Name", "Email", "Role", "Score", "Date"];
    const rows = stats.recentAnalyses.map(a => [
      a.id,
      a.name,
      a.email,
      a.predictedRole,
      a.resumeScore,
      a.timestamp?.toDate().toLocaleDateString(),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "resume_analyses.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-slate-900">Admin Dashboard</h3>
        <button
          onClick={downloadCSV}
          className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Users</p>
            <p className="text-2xl font-black text-slate-900">{stats.totalUsers}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Analyses</p>
            <p className="text-2xl font-black text-slate-900">{stats.totalAnalyses}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center text-yellow-600">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Avg Rating</p>
            <p className="text-2xl font-black text-slate-900">{stats.avgRating}/5</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100">
          <h4 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Predicted Roles Distribution
          </h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.roleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.roleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100">
          <h4 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            User Ratings
          </h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.ratingData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <Tooltip cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Analyses Table */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-100">
          <h4 className="text-lg font-bold text-slate-900">Recent Analyses</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-widest">
                <th className="px-8 py-4">Name</th>
                <th className="px-8 py-4">Predicted Role</th>
                <th className="px-8 py-4">Score</th>
                <th className="px-8 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recentAnalyses.map((analysis) => (
                <tr key={analysis.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{analysis.name}</span>
                      <span className="text-xs text-slate-500">{analysis.email}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
                      {analysis.predictedRole}
                    </span>
                  </td>
                  <td className="px-8 py-4">
                    <span className={`font-bold ${analysis.resumeScore >= 80 ? "text-green-600" : analysis.resumeScore >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                      {analysis.resumeScore}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-sm text-slate-500">
                    {analysis.timestamp?.toDate().toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
