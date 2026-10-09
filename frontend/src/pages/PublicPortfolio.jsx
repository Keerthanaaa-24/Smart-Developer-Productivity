import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FaUserTie,
  FaGithub,
  FaLinkedin,
  FaTwitter,
  FaGlobe,
  FaPrint,
  FaCheckCircle,
  FaExternalLinkAlt,
  FaCode,
  FaGraduationCap,
  FaShieldAlt,
  FaRocket,
  FaEnvelope,
  FaMapMarkerAlt,
  FaLayerGroup,
  FaStar,
} from "react-icons/fa";
import portfolioApi from "../api/portfolioApi";

const PublicPortfolio = () => {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPublicData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await portfolioApi.getPublicPortfolio(slug);
        setData(res);
      } catch (err) {
        console.error("Error fetching public portfolio:", err);
        setError(
          err.response?.data?.detail ||
            "This public portfolio is private or does not exist."
        );
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPublicData();
    }
  }, [slug]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-400">Loading verified portfolio...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white">
        <div className="max-w-md w-full bg-slate-800/80 p-8 rounded-3xl border border-slate-700 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-2xl mx-auto">
            <FaShieldAlt />
          </div>
          <h2 className="text-xl font-bold">Portfolio Unavailable</h2>
          <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          <div className="pt-2">
            <Link
              to="/login"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition inline-block"
            >
              Go to Smart Dev Platform
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-purple-500 selection:text-white print:bg-white print:text-slate-900">
      {/* PRINT-ONLY RESUME HEADER STYLING IS INCLUDED IN UTILS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; font-size: 11pt; }
          .print-card { border: 1px solid #e2e8f0 !important; background: white !important; color: black !important; box-shadow: none !important; }
        }
      `}</style>

      {/* TOP NAVIGATION / ACTION BAR (NO PRINT) */}
      <header className="no-print sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-sm font-black shadow-md shadow-purple-500/20">
              <FaRocket />
            </div>
            <div>
              <span className="text-xs font-black tracking-tight text-white block">Smart Dev Portfolio</span>
              <span className="text-[10px] text-purple-400 font-bold uppercase">Verified Telemetry</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-500/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <FaPrint /> Print / Save as PDF
            </button>
            <Link
              to="/login"
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN PORTFOLIO CONTAINER */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* HERO SECTION */}
        <section className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden print-card">
          <div className="space-y-4 relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <FaCheckCircle className="text-[10px]" /> Verified Telemetry Candidate
              </span>
              {data.location && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <FaMapMarkerAlt className="text-slate-500" /> {data.location}
                </span>
              )}
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {data.developer_name}
              </h1>
              <p className="text-base font-bold text-indigo-300 mt-1">{data.headline}</p>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {data.about_me}
            </p>

            {/* CONTACT & SOCIAL LINKS */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {data.links?.github && (
                <a
                  href={data.links.github}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition border border-slate-700"
                >
                  <FaGithub /> GitHub Profile
                </a>
              )}
              {data.links?.linkedin && (
                <a
                  href={data.links.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-blue-300 text-xs font-bold flex items-center gap-1.5 transition border border-slate-700"
                >
                  <FaLinkedin /> LinkedIn
                </a>
              )}
              {data.links?.website && (
                <a
                  href={data.links.website}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition border border-slate-700"
                >
                  <FaGlobe /> Portfolio
                </a>
              )}
              {data.public_contact_email && (
                <a
                  href={`mailto:${data.public_contact_email}`}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition border border-purple-500/30"
                >
                  <FaEnvelope /> {data.public_contact_email}
                </a>
              )}
            </div>
          </div>
        </section>

        {/* 5-PILLAR CAREER READINESS */}
        {data.career_readiness && (
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4 print-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                  <FaShieldAlt /> 5-Pillar Career Readiness Index
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Grounded in verified code commits, algorithm challenges, and curriculum milestones
                </p>
              </div>
              <span className="text-xl font-black text-purple-300 self-start sm:self-auto">
                {data.career_readiness.overall_score}% ({data.career_readiness.evaluation_grade})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              {Object.entries(data.career_readiness.pillars || {}).map(([key, p]) => (
                <div key={key} className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 block truncate">
                    {p.name?.split(" ")[0]} ({p.weight})
                  </span>
                  <span className="text-base font-black text-white mt-1 block">
                    {p.score}%
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* VERIFIED TELEMETRY METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* GITHUB METRICS */}
          {data.github_metrics && (
            <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4 print-card">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <FaGithub className="text-purple-400" /> GitHub Version Control Evidence
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                  OAuth2 Verified
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40">
                  <span className="text-2xl font-black text-white block">
                    {data.github_metrics.public_repos}
                  </span>
                  <span className="text-xs text-slate-400">Public Repositories</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40">
                  <span className="text-2xl font-black text-white block">
                    {data.github_metrics.total_contributions}
                  </span>
                  <span className="text-xs text-slate-400">Recorded Contributions</span>
                </div>
              </div>
            </section>
          )}

          {/* CODING PLATFORMS */}
          {data.coding_metrics && (
            <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4 print-card">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <FaCode className="text-amber-400" /> Algorithmic Problem Solving
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                  API Verified
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40">
                  <span className="text-2xl font-black text-white block">
                    {data.coding_metrics.leetcode?.total_solved || 0}
                  </span>
                  <span className="text-xs text-slate-400">LeetCode Challenges</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40">
                  <span className="text-2xl font-black text-white block">
                    {data.coding_metrics.geeksforgeeks?.problems_solved || 0}
                  </span>
                  <span className="text-xs text-slate-400">GFG Solved</span>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* FEATURED PROJECTS */}
        {data.featured_projects?.length > 0 && (
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4 print-card">
            <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
              <FaLayerGroup /> Demonstrated Project Repositories
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.featured_projects.map((proj, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-white">{proj.name}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                        {proj.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{proj.description}</p>
                    <div className="flex flex-wrap gap-1.5 pt-3">
                      {proj.tech_stack?.map((t, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-700/80 text-slate-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {proj.github_repo_url && (
                    <div className="pt-3 border-t border-slate-700/40 mt-2">
                      <a
                        href={proj.github_repo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        <FaExternalLinkAlt className="text-[10px]" /> View Repository
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* VERIFIED SKILLS & LEARNING MILESTONES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SKILLS */}
          {data.skills?.length > 0 && (
            <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3 print-card">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <FaStar className="text-purple-400" /> Verified Technical Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-xl bg-purple-950/50 border border-purple-800/60 text-purple-300 text-xs font-bold flex items-center gap-1.5"
                  >
                    <FaCheckCircle className="text-[10px] text-emerald-400" /> {s.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* LEARNING MILESTONES */}
          {data.learning_milestones?.length > 0 && (
            <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3 print-card">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <FaGraduationCap className="text-indigo-400" /> Learning & Certifications
              </h3>
              <div className="space-y-2">
                {data.learning_milestones.slice(0, 4).map((m, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-800/30 border border-slate-700/40 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">{m.title}</span>
                      <span className="text-[10px] text-slate-400">{m.platform} • {m.date}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10">
                      Verified
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* FOOTER */}
        <footer className="pt-8 text-center text-xs text-slate-500 border-t border-slate-800 space-y-1">
          <p>Generated by Smart Developer Productivity Platform • Cryptographically Isolated & Verified Telemetry</p>
          <p className="text-[10px] text-slate-600">Last updated: {new Date(data.last_updated).toLocaleDateString()}</p>
        </footer>
      </main>
    </div>
  );
};

export default PublicPortfolio;
