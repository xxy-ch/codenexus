import { useState } from 'react'

export function Dashboard() {
  const [streak, setStreak] = useState(14)

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                Welcome back, Alex! 👋
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md text-sm">
                You've solved <span className="text-primary font-semibold">12</span> problems this week.
                Keep up the momentum to reach Grandmaster level.
              </p>
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Global Rank
                  </div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white flex items-baseline">
                    #4,291
                    <span className="text-green-500 text-xs ml-2 flex items-center">
                      <span className="material-symbols-outlined text-sm">arrow_upward</span> 12
                    </span>
                  </div>
                </div>
                <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Rating
                  </div>
                  <div className="text-xl font-bold text-primary flex items-baseline">
                    1,942
                    <span className="text-slate-400 text-xs ml-1 font-normal">(Top 5%)</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 sm:mt-0 w-full sm:w-48 h-24 flex items-end justify-between gap-1">
              <div className="w-full bg-primary/10 rounded-sm h-[40%] group-hover:bg-primary/20 transition-colors" />
              <div className="w-full bg-primary/20 rounded-sm h-[60%] group-hover:bg-primary/30 transition-colors" />
              <div className="w-full bg-primary/30 rounded-sm h-[50%] group-hover:bg-primary/40 transition-colors" />
              <div className="w-full bg-primary/40 rounded-sm h-[75%] group-hover:bg-primary/50 transition-colors" />
              <div className="w-full bg-primary/60 rounded-sm h-[65%] group-hover:bg-primary/70 transition-colors" />
              <div className="w-full bg-primary rounded-sm h-[90%] shadow-lg shadow-primary/30" />
            </div>
          </div>
        </div>

        {/* Streak Card */}
        <div className="md:col-span-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Current Streak
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {streak} Days
              </div>
            </div>
            <div className="h-10 w-10 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center dark:bg-orange-900/30 dark:text-orange-400">
              <span className="material-symbols-outlined filled">local_fire_department</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm mb-2 text-slate-600 dark:text-slate-400">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>

          <div className="flex justify-between items-center gap-1">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium">
              <span className="material-symbols-outlined text-sm">check</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium">
              <span className="material-symbols-outlined text-sm">check</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium">
              <span className="material-symbols-outlined text-sm">check</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium shadow-md shadow-primary/30">
              {streak}
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
          </div>

          <p className="text-xs text-slate-400 mt-4 text-center">
            Solve 1 problem today to keep the streak alive!
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <span className="material-symbols-outlined filled">task_alt</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">482</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Problems Solved</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <span className="material-symbols-outlined filled">gps_fixed</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">76%</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Accuracy Rate</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-md flex items-center justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          <div className="relative z-10">
            <div className="text-xs text-blue-200 font-semibold uppercase mb-1">Daily Challenge</div>
            <div className="font-bold text-lg mb-1">Dynamic Frog Jump</div>
            <div className="text-xs text-slate-300">Hard • DP • Graph</div>
          </div>
          <button className="relative z-10 h-10 w-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors border border-white/10">
            <span className="material-symbols-outlined text-white">play_arrow</span>
          </button>
        </div>
      </div>

      {/* Contests */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            Active & Upcoming Contests
          </h3>
          <a className="text-sm font-medium text-primary hover:text-blue-700 flex items-center" href="#">
            View all <span className="material-symbols-outlined text-base ml-1">arrow_forward</span>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Live Contest */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-0 overflow-hidden flex flex-col">
            <div className="h-1 bg-green-500 w-full" />
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded dark:bg-green-900/30 dark:text-green-400 animate-pulse-slow">
                  LIVE NOW
                </span>
                <span className="text-slate-400 text-sm flex items-center">
                  <span className="material-symbols-outlined text-base mr-1">schedule</span> Ends in 1h 20m
                </span>
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Weekly Code Sprint #104
              </h4>
              <p className="text-slate-500 text-sm mb-6 dark:text-slate-400">
                Join 3,200+ developers competing in algorithm challenges. Prize pool includes exclusive badges.
              </p>
              <div className="flex items-center justify-between mt-auto">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-gradient-to-br from-primary to-blue-400"
                    />
                  ))}
                  <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-medium">
                    +2k
                  </div>
                </div>
                <button className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary/20">
                  Enter Contest
                </button>
              </div>
            </div>
          </div>

          {/* Upcoming Contest */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-0 overflow-hidden flex flex-col">
            <div className="h-1 bg-indigo-500 w-full" />
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded dark:bg-indigo-900/30 dark:text-indigo-400">
                  UPCOMING
                </span>
                <span className="text-slate-400 text-sm flex items-center">
                  <span className="material-symbols-outlined text-base mr-1">event</span> Oct 24, 08:00 PM
                </span>
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Bi-Weekly Enterprise Cup
              </h4>
              <p className="text-slate-500 text-sm mb-6 dark:text-slate-400">
                Sponsored by TechCorp. Focus on system design and database optimization problems.
              </p>
              <div className="flex items-center justify-between mt-auto">
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">584</span> Registered
                </div>
                <button className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-5 py-2 rounded-lg text-sm font-medium transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700">
                  Register Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}