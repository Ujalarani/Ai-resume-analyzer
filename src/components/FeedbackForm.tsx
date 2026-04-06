import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { User } from "firebase/auth";
import { Star, Send, CheckCircle2, MessageSquare, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const FeedbackForm: React.FC<{ user: User }> = ({ user }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      const q = query(collection(db, "feedbacks"), orderBy("timestamp", "desc"), limit(5));
      const snap = await getDocs(q);
      setFeedbacks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchFeedbacks();
  }, [submitted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "feedbacks"), {
        uid: user.uid,
        displayName: user.displayName,
        rating,
        comment,
        timestamp: serverTimestamp(),
      });
      setSubmitted(true);
      setRating(0);
      setComment("");
    } catch (error) {
      console.error("Feedback Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100"
      >
        <h3 className="text-2xl font-bold text-slate-900 mb-2">Share Your Feedback</h3>
        <p className="text-slate-500 mb-8">Your insights help us improve the AI Resume Analyzer for everyone.</p>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h4>
            <p className="text-slate-500 mb-8">Your feedback has been submitted successfully.</p>
            <button
              onClick={() => setSubmitted(false)}
              className="text-blue-600 font-bold hover:underline"
            >
              Submit another feedback
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                Overall Rating
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    className="p-1 transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= (hover || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-slate-200"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                Your Comments
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us what you liked or what we can improve..."
                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={rating === 0 || loading}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
                rating === 0 || loading
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-[0.98]"
              }`}
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Feedback
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6"
      >
        <h4 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-blue-600" />
          Recent Community Feedback
        </h4>

        <div className="space-y-4">
          {feedbacks.map((f) => (
            <div key={f.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                    {f.displayName?.[0] || "U"}
                  </div>
                  <span className="font-bold text-slate-900 text-sm">{f.displayName || "Anonymous"}</span>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 ${
                        star <= f.rating ? "fill-yellow-400 text-yellow-400" : "text-slate-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed italic">"{f.comment || "No comment provided."}"</p>
              <div className="mt-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {f.timestamp?.toDate().toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
