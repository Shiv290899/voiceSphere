import { Card, Badge } from '@voicesphere/ui';
import { ShieldCheck, BarChart3, Users, Volume2, ShieldAlert } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full flex flex-col gap-6">
        <div className="flex items-center gap-3 mb-4 justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-rose-600 p-2 rounded-xl shadow-lg shadow-rose-500/25">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">VoiceSphere Admin Panel</h1>
          </div>
          <Badge variant="danger">Live Moderation</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="p-5 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Users</span>
                <h3 className="text-3xl font-black mt-1">1,248</h3>
              </div>
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <span className="text-xs text-emerald-400 font-medium mt-4">+12% from yesterday</span>
          </Card>

          <Card className="p-5 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Active Rooms</span>
                <h3 className="text-3xl font-black mt-1">42</h3>
              </div>
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                <Volume2 className="h-5 w-5" />
              </div>
            </div>
            <span className="text-xs text-emerald-400 font-medium mt-4">8 live broadcasts</span>
          </Card>

          <Card className="p-5 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Pending Reports</span>
                <h3 className="text-3xl font-black mt-1">5</h3>
              </div>
              <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </div>
            <span className="text-xs text-rose-400 font-medium mt-4">Requires attention</span>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-400" /> Platform Audit Trail
          </h3>
          <div className="divide-y divide-slate-800">
            <div className="py-3 flex justify-between items-center text-sm">
              <span className="text-slate-300 text-xs md:text-sm">User <b className="text-indigo-400">Moderator_A</b> banned room <b className="text-slate-100">"Free Coins Chat"</b></span>
              <span className="text-slate-500 text-xs">2 mins ago</span>
            </div>
            <div className="py-3 flex justify-between items-center text-sm">
              <span className="text-slate-300 text-xs md:text-sm">Earning payout withdrawal request approved for <b className="text-indigo-400">Host_99</b></span>
              <span className="text-slate-500 text-xs">15 mins ago</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default App;
