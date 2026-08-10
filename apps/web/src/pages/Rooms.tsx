import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../core/api-client';
import { Card, Button, Input, Badge, Avatar } from '@voicesphere/ui';
import { Mic, Plus, Users, ShieldAlert, RefreshCw, X, Tag } from 'lucide-react';

interface Room {
  id: string;
  title: string;
  description?: string;
  category: string;
  coverImageUrl?: string;
  isPrivate: boolean;
  maxParticipants: number;
  owner: {
    username: string;
    avatarUrl?: string;
    profile?: {
      displayName?: string;
    };
  };
  _count: {
    members: number;
  };
}

export const Rooms: React.FC = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Social');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Join gate states
  const [joiningRoom, setJoiningRoom] = useState<Room | null>(null);
  const [joinPassword, setJoinPassword] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const fetchRooms = async () => {
    try {
      const url = categoryFilter ? `/rooms?category=${categoryFilter}` : '/rooms';
      const res = await apiClient.get(url);
      setRooms(res.data);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [categoryFilter]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setSubmitting(true);
    try {
      const res = await apiClient.post('/rooms', {
        title,
        description,
        category,
        isPrivate,
        password: isPrivate ? password : undefined,
      });
      setShowCreateModal(false);
      navigate(`/rooms/${res.data.id}`);
    } catch (err) {
      alert('Failed to create voice room.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinClick = (room: Room) => {
    if (room.isPrivate) {
      setJoiningRoom(room);
      setJoinPassword('');
      setJoinError(null);
    } else {
      executeJoin(room.id);
    }
  };

  const executeJoin = async (roomId: string, pass?: string) => {
    try {
      await apiClient.post(`/rooms/${roomId}/join`, { password: pass });
      setJoiningRoom(null);
      navigate(`/rooms/${roomId}`);
    } catch (err: any) {
      setJoinError(err.response?.data?.message || 'Failed to join. Invalid password?');
    }
  };

  return (
    <div className="max-w-5xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
      {/* Header Panel */}
      <div className="flex justify-between items-center bg-slate-950/20 border-b border-slate-900 pb-5">
        <div className="text-left">
          <h2 className="text-xl font-black text-slate-200 flex items-center gap-2">
            <Mic className="h-5 w-5 text-indigo-400" /> Voice Lounges
          </h2>
          <p className="text-slate-500 text-xs mt-1">Join a live discussion, listen to hosts, or start your own stage.</p>
        </div>

        <Button variant="primary" onClick={() => setShowCreateModal(true)} className="rounded-xl h-10 font-bold text-xs">
          <Plus className="mr-1.5 h-4 w-4" /> Start Room
        </Button>
      </div>

      {/* Categories Toolbar */}
      <div className="flex flex-wrap gap-2">
        {['', 'Social', 'Music', 'Tech', 'Gaming', 'Education'].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
              categoryFilter === cat
                ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400'
                : 'bg-slate-950/40 border-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat || 'All Lounges'}
          </button>
        ))}
      </div>

      {/* Lounges Grid */}
      {loading ? (
        <div className="text-center text-slate-500 py-16 flex flex-col items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
          <span className="text-xs">Finding active voice rooms...</span>
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center text-slate-500 py-20 bg-slate-950/20 border border-slate-900 rounded-2xl">
          <Mic className="h-10 w-10 mx-auto text-slate-700 mb-2" />
          <p className="text-sm font-semibold">No Live Rooms Found</p>
          <p className="text-xs text-slate-600 mt-1">Start a new voice room to begin broadcasting live!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <Card key={room.id} className="p-5 border-slate-900 bg-slate-950/40 rounded-2xl flex flex-col justify-between hover:border-slate-800 transition-all group">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] bg-slate-900 border border-slate-800 text-indigo-400 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Tag className="h-2.5 w-2.5" /> {room.category}
                  </span>
                  
                  {room.isPrivate && (
                    <Badge variant="danger" className="text-[9px] px-1.5 py-0.5">
                      Private
                    </Badge>
                  )}
                </div>

                <h3 className="font-extrabold text-sm text-slate-200 truncate group-hover:text-indigo-400 transition-colors">
                  {room.title}
                </h3>
                
                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                  {room.description || 'Join this live voice lounge discussion.'}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-950 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Avatar fallback={room.owner.username.substring(0, 2).toUpperCase()} size="sm" />
                  <div className="text-left">
                    <div className="text-[10px] font-bold text-slate-300">
                      {room.owner.profile?.displayName || room.owner.username}
                    </div>
                    <div className="text-[8px] text-slate-500">Host</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {room._count.members}
                  </span>
                  
                  <Button variant="secondary" onClick={() => handleJoinClick(room)} className="h-8 px-4 rounded-lg text-[10px] font-bold">
                    Join
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Start Room modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <Card className="max-w-md w-full p-6 border-slate-800 bg-slate-900 rounded-2xl relative">
            <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300">
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-bold text-sm text-slate-200 mb-4 flex items-center gap-1.5">
              <Mic className="h-4.5 w-4.5 text-indigo-400" /> Start Live Voice Lounge
            </h3>

            <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
              <Input label="Room Title" placeholder="Chill & Chat ☕" value={title} onChange={(e) => setTitle(e.target.value)} required />
              
              <div className="flex flex-col gap-1 text-left">
                <label className="text-slate-400 text-xs font-bold mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this lounge about?"
                  className="w-full h-20 bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 text-left">
                  <label className="text-slate-400 text-xs font-bold mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-slate-300 focus:outline-none"
                  >
                    <option value="Social">Social</option>
                    <option value="Music">Music</option>
                    <option value="Tech">Tech</option>
                    <option value="Gaming">Gaming</option>
                    <option value="Education">Education</option>
                  </select>
                </div>

                <div className="flex items-center gap-2.5 mt-6 ml-2">
                  <input
                    type="checkbox"
                    id="isPrivate"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="h-4.5 w-4.5 border-slate-800 rounded bg-slate-950 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="isPrivate" className="text-slate-400 text-xs font-bold cursor-pointer">Private Lounge</label>
                </div>
              </div>

              {isPrivate && (
                <Input
                  label="Room Password"
                  type="password"
                  placeholder="Enter 4-digit code..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              )}

              <Button variant="primary" type="submit" disabled={submitting || !title} className="h-11 w-full mt-2 font-bold text-xs rounded-xl">
                {submitting ? 'Starting...' : 'Go Live Now'}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* Private Room Pass Gate Modal */}
      {joiningRoom && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <Card className="max-w-xs w-full p-6 border-slate-800 bg-slate-900 rounded-2xl relative">
            <button onClick={() => setJoiningRoom(null)} className="absolute top-4 right-4 p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300">
              <X className="h-4 w-4" />
            </button>

            <div className="text-center mb-5 flex flex-col items-center gap-2">
              <ShieldAlert className="h-7 w-7 text-indigo-500" />
              <h3 className="font-bold text-xs text-slate-200">Lounge Password Required</h3>
              <p className="text-[10px] text-slate-500">"{joiningRoom.title}" requires a password to enter.</p>
            </div>

            {joinError && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2.5 rounded-xl text-[10px] text-center">
                {joinError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeJoin(joiningRoom.id, joinPassword);
              }}
              className="flex flex-col gap-4"
            >
              <Input
                type="password"
                placeholder="Enter password..."
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                className="text-center text-sm tracking-widest font-bold"
                required
                autoFocus
              />

              <Button variant="primary" type="submit" className="h-10 w-full font-bold text-xs rounded-xl">
                Unlock and Join
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
