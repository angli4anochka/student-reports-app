import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Blur spots - decorative background */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-300/40 rounded-full blur-3xl"></div>
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-300/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-indigo-300/25 rounded-full blur-3xl"></div>

      {/* Header Navigation */}
      <header className="relative z-10 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-2">
              <span className="text-blue-600 text-sm font-semibold">📚 TutorFlow</span>
            </div>

            <nav className="flex gap-6 items-center">
              <a href="#features" className="text-slate-600 hover:text-slate-900 text-sm transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-slate-600 hover:text-slate-900 text-sm transition-colors">
                Pricing
              </a>
              <button
                onClick={() => navigate('/login')}
                className="text-slate-600 hover:text-slate-900 text-sm transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-all"
              >
                Start free trial
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left Content */}
            <div className="pt-8">
              <h1 className="text-5xl font-bold text-slate-900 mb-4 leading-tight">
                All your tutoring &<br />
                mini-school management<br />
                in one place
              </h1>

              <p className="text-slate-600 text-base mb-2">
                <span className="font-semibold">Schedule, Students, Teachers, Payments, Reports.</span>
              </p>

              <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                Track every Dollar and interaction. <span className="font-semibold text-slate-900">TutorFlow</span> helps
                you stay on top of your business. Manage your
                schedule and payments — all in one dashboard!
              </p>

              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => navigate('/register')}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
                >
                  Schedule a Demo
                </button>

                <button
                  className="bg-white border border-slate-300 px-5 py-2.5 rounded-lg hover:bg-slate-50 font-semibold text-slate-700 text-sm transition-all"
                >
                  Watch Demo Videos
                </button>
              </div>

              <div className="flex gap-4 items-center text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Free 14-day trial</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>No credit card required</span>
                </div>
              </div>
            </div>

            {/* Right Content - Real Laptop Mockup */}
            <div className="relative py-12 px-4">

              {/* Background glow */}
              <div className="absolute inset-0 -z-10 blur-3xl opacity-50 bg-gradient-to-tr from-blue-300 via-indigo-200 to-cyan-200"></div>

              {/* Laptop wrapper with perspective */}
              <div className="relative" style={{ perspective: '1400px' }}>
                <div className="relative mx-auto transform-gpu"
                     style={{ transform: 'rotateY(-14deg) rotateX(6deg) translateY(8px)', transformStyle: 'preserve-3d' }}>

                  {/* Screen (bezel + glass) */}
                  <div className="relative z-20 rounded-[30px] bg-white/70 backdrop-blur-xl border border-white/60 overflow-hidden"
                       style={{ boxShadow: '0 50px 140px -60px rgba(0,0,0,0.45)' }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/0 pointer-events-none z-10"></div>

                    {/* Camera dot */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-300/70 z-10"></div>

                    {/* Screen content */}
                    <div className="aspect-[16/10] w-full bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
                      {/* Top bar */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">📚</span>
                          <span className="text-sm font-semibold text-slate-800">TutorFlow</span>
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-semibold">Live</span>
                        </div>
                        <div className="flex gap-3 text-xs text-slate-500">
                          <span>📊 Dashboard</span>
                          <span>💰 Earnings</span>
                          <span>📅 Schedule</span>
                        </div>
                      </div>

                      {/* Greeting */}
                      <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-xl p-3 mb-3 shadow-md">
                        <div className="flex items-center gap-2 text-white">
                          <span className="text-xl">😊</span>
                          <div>
                            <div className="text-sm font-semibold">GOOD Afternoon, Sarah</div>
                            <div className="text-xs opacity-80">Today's Income · 4,800₽</div>
                          </div>
                        </div>
                      </div>

                      {/* Stats 2x2 */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-white/80 rounded-xl p-3 border border-white/60 shadow-sm">
                          <div className="flex items-center gap-1.5 mb-1"><span>💰</span><span className="text-xs font-semibold text-slate-600">Earnings</span></div>
                          <div className="text-xl font-bold text-slate-900">4,800<span className="text-sm">₽</span></div>
                          <div className="text-xs text-slate-500">this month</div>
                        </div>
                        <div className="bg-white/80 rounded-xl p-3 border border-white/60 shadow-sm">
                          <div className="flex items-center gap-1.5 mb-1"><span>✅</span><span className="text-xs font-semibold text-slate-600">Paid</span></div>
                          <div className="text-xl font-bold text-emerald-600">28</div>
                          <div className="text-xs text-slate-500">lessons</div>
                        </div>
                        <div className="bg-white/80 rounded-xl p-3 border border-white/60 shadow-sm">
                          <div className="flex items-center gap-1.5 mb-1"><span>👥</span><span className="text-xs font-semibold text-slate-600">Students</span></div>
                          <div className="text-xl font-bold text-slate-900">24</div>
                          <div className="text-xs text-slate-500">active</div>
                        </div>
                        <div className="bg-white/80 rounded-xl p-3 border border-white/60 shadow-sm">
                          <div className="flex items-center gap-1.5 mb-1"><span>📊</span><span className="text-xs font-semibold text-slate-600">Reports</span></div>
                          <div className="text-xl font-bold text-slate-900">12</div>
                          <div className="text-xs text-slate-500">this week</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Keyboard / Base */}
                  <div className="relative z-10 mx-auto -mt-6 rounded-b-[40px] bg-white/60 backdrop-blur-xl border border-white/50 transform-gpu"
                       style={{ height: '128px', width: '94%', boxShadow: '0 60px 140px -90px rgba(0,0,0,0.65)', transform: 'translateZ(-60px) rotateX(62deg)', transformOrigin: 'top' }}>
                    <div className="absolute inset-0 rounded-b-[40px] bg-gradient-to-b from-slate-100/10 via-slate-200/25 to-slate-500/25"></div>
                    {/* Keyboard hint lines */}
                    <div className="absolute left-8 right-8 top-8 h-2 rounded-full bg-slate-300/35"></div>
                    <div className="absolute left-8 right-16 top-14 h-2 rounded-full bg-slate-300/25"></div>
                    {/* Trackpad */}
                    <div className="absolute left-1/2 top-20 -translate-x-1/2 w-56 h-14 rounded-2xl bg-slate-200/35 border border-white/50"></div>
                  </div>
                </div>
              </div>


            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-16 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-2">
            Teaching and managing a mini-school is hard enough.
          </h2>
          <p className="text-slate-600 text-center mb-12">
            Administration shouldn't be
          </p>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: '📊', title: 'Excel sheets', subtitle: 'Messy spreadsheets, forgotten payments' },
              { icon: '💸', title: 'Missed payments', subtitle: 'Untracked income, lost revenue' },
              { icon: '📅', title: 'Forgotten lessons', subtitle: 'Students hurt, engagement drops' },
              { icon: '🚨', title: 'Mini-Desk', subtitle: 'Difficulty tracking payments & tasks' }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  {feature.title}
                </h3>
                <p className="text-slate-600 text-sm">
                  {feature.subtitle}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
