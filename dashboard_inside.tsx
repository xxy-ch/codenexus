<div className="p-8 max-w-[1440px] mx-auto space-y-8">
<!-- Statistics Bento Grid -->
<section className="grid grid-cols-1 md:grid-cols-4 gap-6">
<!-- Solved Count -->
<div className="bg-surface-container-lowest p-6 rounded-lg border-none flex flex-col justify-between group hover:bg-surface-container-low transition-colors duration-300">
<div>
<span className="text-primary text-[10px] font-bold uppercase tracking-[0.2em] block mb-1">Solved Problems</span>
<h2 className="text-4xl font-extrabold tracking-tighter text-on-background">412</h2>
</div>
<div className="mt-4 flex items-center gap-2">
<span className="text-xs font-semibold text-tertiary-container flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]" data-icon="trending_up">trending_up</span> +12
                        </span>
<span className="text-[10px] text-slate-400 font-medium">this month</span>
</div>
</div>
<!-- Global Ranking -->
<div className="bg-surface-container-lowest p-6 rounded-lg border-none flex flex-col justify-between hover:bg-surface-container-low transition-colors duration-300">
<div>
<span className="text-primary text-[10px] font-bold uppercase tracking-[0.2em] block mb-1">Current Ranking</span>
<h2 className="text-4xl font-extrabold tracking-tighter text-on-background">#1,204</h2>
</div>
<div className="mt-4">
<div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
<div className="bg-primary w-3/4 h-full"></div>
</div>
<p className="text-[10px] text-slate-400 mt-2 font-medium">Top 2% of total users</p>
</div>
</div>
<!-- Streak -->
<div className="bg-surface-container-lowest p-6 rounded-lg border-none flex flex-col justify-between hover:bg-surface-container-low transition-colors duration-300">
<div>
<span className="text-primary text-[10px] font-bold uppercase tracking-[0.2em] block mb-1">Current Streak</span>
<div className="flex items-baseline gap-2">
<h2 className="text-4xl font-extrabold tracking-tighter text-on-background">14</h2>
<span className="text-lg font-bold text-slate-400">Days</span>
</div>
</div>
<div className="mt-4 flex gap-1">
<!-- Tiny Heatmap Representation -->
<div className="w-2 h-2 rounded-sm bg-primary"></div>
<div className="w-2 h-2 rounded-sm bg-primary"></div>
<div className="w-2 h-2 rounded-sm bg-primary/20"></div>
<div className="w-2 h-2 rounded-sm bg-primary"></div>
<div className="w-2 h-2 rounded-sm bg-primary"></div>
<div className="w-2 h-2 rounded-sm bg-primary"></div>
<div className="w-2 h-2 rounded-sm bg-primary"></div>
</div>
</div>
<!-- Rating -->
<div className="bg-gradient-to-br from-primary to-primary-container p-6 rounded-lg border-none text-white shadow-xl shadow-primary/20">
<span className="text-primary-fixed/60 text-[10px] font-bold uppercase tracking-[0.2em] block mb-1">Elo Rating</span>
<h2 className="text-4xl font-extrabold tracking-tighter">2,410</h2>
<div className="mt-4 bg-white/10 backdrop-blur-md rounded px-2 py-1 inline-flex items-center gap-2">
<span className="material-symbols-outlined text-sm" data-icon="stars" >stars</span>
<span className="text-[10px] font-bold uppercase tracking-widest">Grandmaster</span>
</div>
</div>
</section>
<!-- Main Grid: Recent Submissions & Sidebar Widgets -->
<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
<!-- Recent Submissions Table -->
<div className="lg:col-span-8 space-y-6">
<div className="flex items-center justify-between">
<h3 className="text-xl font-extrabold tracking-tight text-on-background">Recent Submissions</h3>
<button className="text-sm font-bold text-primary hover:underline transition-all">View all history</button>
</div>
<div className="overflow-hidden bg-surface-container-lowest rounded-lg">
<table className="w-full text-left border-collapse">
<thead>
<tr className="bg-surface-container-low text-slate-500">
<th className="px-6 py-4 font-manrope text-[10px] font-black uppercase tracking-widest">Problem</th>
<th className="px-6 py-4 font-manrope text-[10px] font-black uppercase tracking-widest">Status</th>
<th className="px-6 py-4 font-manrope text-[10px] font-black uppercase tracking-widest">Runtime</th>
<th className="px-6 py-4 font-manrope text-[10px] font-black uppercase tracking-widest">Date</th>
</tr>
</thead>
<tbody className="divide-y divide-slate-50">
<tr className="hover:bg-slate-50/50 transition-colors">
<td className="px-6 py-4">
<p className="text-sm font-bold text-on-background">Longest Palindromic Substring</p>
<p className="text-[10px] text-slate-400 font-medium">Difficulty: <span className="text-secondary font-bold">Medium</span></p>
</td>
<td className="px-6 py-4">
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary-container text-[10px] font-black uppercase tracking-tighter text-on-tertiary-container">
<span className="material-symbols-outlined text-sm" data-icon="check_circle" >check_circle</span> Accepted
                                        </span>
</td>
<td className="px-6 py-4 font-mono text-xs text-slate-500">42 ms</td>
<td className="px-6 py-4 text-xs text-slate-400 font-medium">2 mins ago</td>
</tr>
<tr className="hover:bg-slate-50/50 transition-colors">
<td className="px-6 py-4">
<p className="text-sm font-bold text-on-background">Median of Two Sorted Arrays</p>
<p className="text-[10px] text-slate-400 font-medium">Difficulty: <span className="text-error font-bold">Hard</span></p>
</td>
<td className="px-6 py-4">
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-container text-[10px] font-black uppercase tracking-tighter text-on-error-container">
<span className="material-symbols-outlined text-sm" data-icon="cancel" >cancel</span> Wrong Answer
                                        </span>
</td>
<td className="px-6 py-4 font-mono text-xs text-slate-500">104 ms</td>
<td className="px-6 py-4 text-xs text-slate-400 font-medium">45 mins ago</td>
</tr>
<tr className="hover:bg-slate-50/50 transition-colors">
<td className="px-6 py-4">
<p className="text-sm font-bold text-on-background">Two Sum</p>
<p className="text-[10px] text-slate-400 font-medium">Difficulty: <span className="text-tertiary font-bold">Easy</span></p>
</td>
<td className="px-6 py-4">
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary-container text-[10px] font-black uppercase tracking-tighter text-on-tertiary-container">
<span className="material-symbols-outlined text-sm" data-icon="check_circle" >check_circle</span> Accepted
                                        </span>
</td>
<td className="px-6 py-4 font-mono text-xs text-slate-500">2 ms</td>
<td className="px-6 py-4 text-xs text-slate-400 font-medium">2 hours ago</td>
</tr>
<tr className="hover:bg-slate-50/50 transition-colors">
<td className="px-6 py-4">
<p className="text-sm font-bold text-on-background">Valid Parentheses</p>
<p className="text-[10px] text-slate-400 font-medium">Difficulty: <span className="text-tertiary font-bold">Easy</span></p>
</td>
<td className="px-6 py-4">
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container text-[10px] font-black uppercase tracking-tighter text-on-secondary-fixed-variant">
<span className="material-symbols-outlined text-sm" data-icon="pending" >pending</span> Pending
                                        </span>
</td>
<td className="px-6 py-4 font-mono text-xs text-slate-500">--</td>
<td className="px-6 py-4 text-xs text-slate-400 font-medium">1 day ago</td>
</tr>
</tbody>
</table>
</div>
</div>
<!-- Sidebar Widgets -->
<div className="lg:col-span-4 space-y-8">
<!-- Upcoming Contests -->
<div className="bg-white p-6 rounded-lg shadow-sm">
<div className="flex items-center gap-2 mb-6">
<span className="material-symbols-outlined text-primary" data-icon="event_available">event_available</span>
<h3 className="text-lg font-extrabold tracking-tight text-on-background">Upcoming Contests</h3>
</div>
<div className="space-y-4">
<div className="flex gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors border-l-4 border-primary">
<div className="flex-shrink-0 text-center">
<p className="text-[10px] font-black text-slate-400 uppercase">May</p>
<p className="text-lg font-black text-primary">24</p>
</div>
<div>
<p className="text-sm font-bold text-on-background">Scholar Cup Series #12</p>
<p className="text-[10px] text-slate-400 font-medium">14:00 - 16:30 • 500 Participants</p>
</div>
</div>
<div className="flex gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors border-l-4 border-slate-200">
<div className="flex-shrink-0 text-center">
<p className="text-[10px] font-black text-slate-400 uppercase">May</p>
<p className="text-lg font-black text-slate-400">28</p>
</div>
<div>
<p className="text-sm font-bold text-on-background">Algorithm Sprint - Vol. 4</p>
<p className="text-[10px] text-slate-400 font-medium">10:00 - 12:00 • 1,200 Participants</p>
</div>
</div>
</div>
<button className="w-full mt-6 py-2.5 bg-surface-container-low hover:bg-surface-container-high text-primary font-bold text-xs rounded transition-colors uppercase tracking-widest">
                            Browse All Contests
                        </button>
</div>
<!-- Recommended Problems -->
<div className="bg-surface-container-low p-6 rounded-lg">
<div className="flex items-center gap-2 mb-6">
<span className="material-symbols-outlined text-primary" data-icon="lightbulb">lightbulb</span>
<h3 className="text-lg font-extrabold tracking-tight text-on-background">Personalized Pick</h3>
</div>
<div className="space-y-1">
<div className="group bg-white p-4 rounded-lg flex items-center justify-between cursor-pointer hover:shadow-md transition-all">
<div>
<p className="text-sm font-bold text-on-background group-hover:text-primary transition-colors">Trapping Rain Water</p>
<p className="text-[10px] text-slate-500 flex items-center gap-2">
<span className="text-error font-bold">Hard</span> • Dynamic Programming
                                    </p>
</div>
<span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors" data-icon="chevron_right">chevron_right</span>
</div>
<div className="group bg-white p-4 rounded-lg flex items-center justify-between cursor-pointer hover:shadow-md transition-all">
<div>
<p className="text-sm font-bold text-on-background group-hover:text-primary transition-colors">Clone Graph</p>
<p className="text-[10px] text-slate-500 flex items-center gap-2">
<span className="text-secondary font-bold">Medium</span> • BFS/DFS
                                    </p>
</div>
<span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors" data-icon="chevron_right">chevron_right</span>
</div>
<div className="group bg-white p-4 rounded-lg flex items-center justify-between cursor-pointer hover:shadow-md transition-all">
<div>
<p className="text-sm font-bold text-on-background group-hover:text-primary transition-colors">Subsets II</p>
<p className="text-[10px] text-slate-500 flex items-center gap-2">
<span className="text-secondary font-bold">Medium</span> • Backtracking
                                    </p>
</div>
<span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors" data-icon="chevron_right">chevron_right</span>
</div>
</div>
</div>
</div>
</div>
</div>
