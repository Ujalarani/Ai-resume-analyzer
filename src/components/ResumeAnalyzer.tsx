import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { User } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { analyzeResume } from "../lib/gemini";
import { FileText, Upload, CheckCircle2, AlertCircle, Loader2, Star, Briefcase, GraduationCap, Lightbulb, Target } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";

interface AnalysisResult {
  basicInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
  };
  skills: string[];
  keywords: string[];
  predictedRole: string;
  recommendations: {
    skillsToAdd: string[];
    courses: string[];
    resumeTips: string[];
  };
  overallScore: number;
  experienceLevel: string;
}

export const ResumeAnalyzer: React.FC<{ user: User }> = ({ user }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setError(null);
    } else {
      setError("Please upload a valid PDF file.");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
  });

  const handleAnalyze = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Check API health first
      console.log("Checking API health...");
      const healthRes = await fetch("/api/health");
      if (!healthRes.ok) {
        console.error("API Health Check Failed:", healthRes.status);
        throw new Error("Backend server is not responding correctly. Please refresh the page.");
      }
      const healthData = await healthRes.json();
      console.log("API Health Check Success:", healthData);

      // 2. Extract text from PDF via server
      const formData = new FormData();
      formData.append("resume", file);

      console.log("Sending PDF to extraction API...");
      const extractRes = await fetch("/api/extract-text", {
        method: "POST",
        body: formData,
      });

      console.log("API Response Status:", extractRes.status);
      const contentType = extractRes.headers.get("content-type");
      console.log("API Content-Type:", contentType);

      if (!extractRes.ok) {
        const errorText = await extractRes.text();
        console.error("API Error Response:", errorText);
        let errorMessage = `Failed to extract text from PDF: ${extractRes.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          // Not JSON, use errorText if it's short
          if (errorText.length < 100) errorMessage = errorText;
        }
        throw new Error(errorMessage);
      }
      
      const data = await extractRes.json();
      const text = data.text;

      if (!text || text.trim().length === 0) {
        throw new Error("No text could be extracted from this PDF. Please try another file.");
      }

      console.log("Text extracted successfully, sending to Gemini...");

      // 3. Analyze text with Gemini
      const analysis = await analyzeResume(text);
      setResult(analysis);

      // 3. Save result to Firestore
      await addDoc(collection(db, "analyses"), {
        uid: user.uid,
        name: analysis.basicInfo.name || "Unknown",
        email: analysis.basicInfo.email || "Unknown",
        resumeScore: analysis.overallScore,
        predictedRole: analysis.predictedRole,
        skills: analysis.skills,
        recommendations: analysis.recommendations,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error("Analysis Error:", err);
      setError("An error occurred during analysis. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {!result ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100"
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Upload Your Resume</h3>
            <p className="text-slate-500">We support PDF files up to 10MB</p>
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
              isDragActive
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 hover:border-blue-400 hover:bg-slate-50"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <Upload className="w-8 h-8" />
              </div>
              {file ? (
                <div className="flex items-center gap-2 text-blue-600 font-semibold">
                  <FileText className="w-5 h-5" />
                  {file.name}
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium text-slate-700">
                    Drag & drop your resume here, or click to select
                  </p>
                  <p className="text-sm text-slate-400 mt-1">Only PDF files are accepted</p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!file || loading}
            className={`w-full mt-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
              !file || loading
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-[0.98]"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Analyzing Your Resume...
              </>
            ) : (
              <>
                <Target className="w-6 h-6" />
                Start Analysis
              </>
            )}
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setResult(null);
                setFile(null);
              }}
              className="text-slate-500 hover:text-slate-900 font-medium flex items-center gap-2"
            >
              ← Analyze Another Resume
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-bold">
              <CheckCircle2 className="w-4 h-4" />
              Analysis Complete
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Basic Info & Score */}
            <div className="lg:col-span-1 space-y-8">
              <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 text-center">
                <div className="relative inline-block mb-6">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="58"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-slate-100"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="58"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={364.4}
                      strokeDashoffset={364.4 - (364.4 * result.overallScore) / 100}
                      className="text-blue-600 transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-900">{result.overallScore}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Score</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-1">{result.basicInfo.name}</h3>
                <p className="text-blue-600 font-semibold mb-4">{result.predictedRole}</p>
                <div className="space-y-2 text-sm text-slate-500">
                  <p>{result.basicInfo.email}</p>
                  <p>{result.basicInfo.phone}</p>
                  <p>{result.basicInfo.location}</p>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <span className="inline-block px-4 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold">
                    {result.experienceLevel} Level
                  </span>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100">
                <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Key Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Recommendations */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100">
                <h4 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Lightbulb className="w-6 h-6 text-blue-600" />
                  Recommendations & Insights
                </h4>

                <div className="space-y-8">
                  <section>
                    <h5 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Skills to Add
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {result.recommendations.skillsToAdd.map((skill, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          <span className="text-slate-700 font-medium">{skill}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h5 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      Recommended Courses
                    </h5>
                    <ul className="space-y-3">
                      {result.recommendations.courses.map((course, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="mt-1.5 w-1.5 h-1.5 bg-green-500 rounded-full shrink-0" />
                          <span className="text-slate-700">{course}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <h5 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Resume Improvement Tips
                    </h5>
                    <div className="prose prose-slate max-w-none">
                      <ul className="space-y-3 list-none p-0">
                        {result.recommendations.resumeTips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                            <div className="mt-1 w-5 h-5 text-blue-600 shrink-0">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <span className="text-slate-700 font-medium">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
