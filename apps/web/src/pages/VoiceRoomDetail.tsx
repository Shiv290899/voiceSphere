import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../core/api-client';
import { useSocket } from '../core/SocketContext';
import { useAuth } from '../core/AuthContext';
import { Card, Button, Avatar, Badge } from '@voicesphere/ui';
import { Mic, MicOff, Hand, LogOut, Gift, RefreshCw, Volume2, Check, X, Award, Sparkles } from 'lucide-react';

interface Member {
  userId: string;
  role: 'HOST' | 'CO_HOST' | 'SPEAKER' | 'LISTENER';
  isSpeaking: boolean;
  isMuted: boolean;
  handRaised: boolean;
  user: {
    username: string;
    avatarUrl?: string;
    profile?: {
      displayName?: string;
    };
  };
}

interface GiftItem {
  id: string;
  name: string;
  coinCost: number;
  iconUrl?: string;
}

interface ActiveGiftAlert {
  id: string;
  sender: string;
  receiver: string;
  giftName: string;
  quantity: number;
}

export const VoiceRoomDetail: React.FC = () => {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [room, setRoom] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [showGiftDrawer, setShowGiftDrawer] = useState(false);
  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [giftRecipientId, setGiftRecipientId] = useState<string>('');
  const [giftQuantity, setGiftQuantity] = useState<number>(1);
  const [activeGiftAlert, setActiveGiftAlert] = useState<ActiveGiftAlert | null>(null);
  const [localMuted, setLocalMuted] = useState(false);

  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRoomData = async () => {
    try {
      const res = await apiClient.get(`/rooms/${roomId}`);
      setRoom(res.data);
      setMembers(res.data.members);
      
      // Select first speaker as default recipient
      const speaker = res.data.members.find((m: Member) => m.userId !== user?.id);
      if (speaker) {
        setGiftRecipientId(speaker.userId);
      } else {
        setGiftRecipientId(res.data.ownerId);
      }
    } catch (err) {
      console.error('Error fetching room details:', err);
      navigate('/rooms');
    } finally {
      setLoading(false);
    }
  };

  const fetchGiftsCatalog = async () => {
    try {
      const res = await apiClient.get('/gifts');
      setGifts(res.data);
      if (res.data.length > 0) {
        setSelectedGift(res.data[0]);
      }
    } catch (err) {
      console.error('Error fetching gifts catalog:', err);
    }
  };

  useEffect(() => {
    fetchRoomData();
    fetchGiftsCatalog();
  }, [roomId]);

  // Bind WebSocket events
  useEffect(() => {
    if (!socket || !room) return;

    // Join room channel
    socket.emit('chat:join_conversations', { conversationIds: [roomId!] });

    socket.on('room:user_joined', (data: any) => {
      // Append user to members list
      const newMember: Member = {
        userId: data.userId,
        role: data.role,
        isSpeaking: false,
        isMuted: false,
        handRaised: false,
        user: {
          username: data.username,
          avatarUrl: data.avatarUrl,
          profile: { displayName: data.displayName },
        },
      };
      setMembers((prev) => {
        if (prev.some((m) => m.userId === data.userId)) return prev;
        return [...prev, newMember];
      });
    });

    socket.on('room:user_left', (data: { userId: string }) => {
      setMembers((prev) => prev.filter((m) => m.userId !== data.userId));
    });

    socket.on('room:raise_hand', (data: { userId: string }) => {
      setMembers((prev) =>
        prev.map((m) => (m.userId === data.userId ? { ...m, handRaised: true } : m))
      );
    });

    socket.on('room:hand_lowered', (data: { userId: string }) => {
      setMembers((prev) =>
        prev.map((m) => (m.userId === data.userId ? { ...m, handRaised: false } : m))
      );
    });

    socket.on('room:speaker_promoted', (data: { userId: string; role: any }) => {
      setMembers((prev) =>
        prev.map((m) => (m.userId === data.userId ? { ...m, role: data.role, handRaised: false } : m))
      );
    });

    socket.on('room:speaker_removed', (data: { userId: string }) => {
      setMembers((prev) =>
        prev.map((m) => (m.userId === data.userId ? { ...m, role: 'LISTENER', isSpeaking: false } : m))
      );
    });

    socket.on('room:mute', (data: { userId: string; isMuted: boolean }) => {
      setMembers((prev) =>
        prev.map((m) => (m.userId === data.userId ? { ...m, isMuted: data.isMuted } : m))
      );
      if (data.userId === user?.id) {
        setLocalMuted(data.isMuted);
      }
    });

    socket.on('room:gift', (data: any) => {
      setActiveGiftAlert({
        id: data.id,
        sender: data.sender.username,
        receiver: data.receiver.username,
        giftName: data.giftName,
        quantity: data.quantity,
      });

      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = setTimeout(() => {
        setActiveGiftAlert(null);
      }, 5000);
    });

    socket.on('room:ended', () => {
      alert('This voice lounge session has been closed by the host.');
      navigate('/rooms');
    });

    return () => {
      socket.off('room:user_joined');
      socket.off('room:user_left');
      socket.off('room:raise_hand');
      socket.off('room:hand_lowered');
      socket.off('room:speaker_promoted');
      socket.off('room:speaker_removed');
      socket.off('room:mute');
      socket.off('room:gift');
      socket.off('room:ended');
    };
  }, [socket, room]);

  const currentMember = members.find((m) => m.userId === user?.id);
  const isHost = currentMember?.role === 'HOST' || currentMember?.role === 'CO_HOST';
  const isSpeaker = currentMember?.role === 'SPEAKER';

  const handleMuteToggle = async () => {
    const targetState = !localMuted;
    try {
      await apiClient.post(`/rooms/${roomId}/mute/${user?.id}`, { isMuted: targetState });
      setLocalMuted(targetState);
    } catch (err) {
      console.error('Error toggling mute:', err);
    }
  };

  const handleHandRaise = async () => {
    try {
      if (currentMember?.handRaised) {
        await apiClient.post(`/rooms/${roomId}/lower-hand`);
      } else {
        await apiClient.post(`/rooms/${roomId}/raise-hand`);
      }
      setMembers((prev) =>
        prev.map((m) => (m.userId === user?.id ? { ...m, handRaised: !m.handRaised } : m))
      );
    } catch (err) {
      console.error('Error handling hand raise:', err);
    }
  };

  const handleLeave = async () => {
    try {
      await apiClient.post(`/rooms/${roomId}/leave`);
      navigate('/rooms');
    } catch (err) {
      navigate('/rooms');
    }
  };

  const handleCloseRoom = async () => {
    if (!confirm('Are you sure you want to end this voice session?')) return;
    try {
      await apiClient.delete(`/rooms/${roomId}`);
      navigate('/rooms');
    } catch (err) {
      alert('Permission denied to close room.');
    }
  };

  // Host Action promotes listener
  const promoteListener = async (listenerId: string) => {
    try {
      await apiClient.post(`/rooms/${roomId}/promote/${listenerId}`);
    } catch (err) {
      alert('Failed to promote user.');
    }
  };

  // Host Action demotes speaker
  const demoteSpeaker = async (speakerId: string) => {
    try {
      await apiClient.post(`/rooms/${roomId}/demote/${speakerId}`);
    } catch (err) {
      alert('Failed to demote speaker.');
    }
  };

  const handleSendGift = async () => {
    if (!selectedGift || !giftRecipientId) return;
    try {
      await apiClient.post('/gifts/send', {
        receiverId: giftRecipientId,
        giftId: selectedGift.id,
        quantity: giftQuantity,
        roomId,
      });
      setShowGiftDrawer(false);
      // Optional: alert message or sound
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send gift. Insufficient coins?');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center text-slate-500 gap-2">
        <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
        <span className="text-xs">Connecting to Voice Lounge WebRTC streams...</span>
      </div>
    );
  }

  const hosts = members.filter((m) => m.role === 'HOST' || m.role === 'CO_HOST');
  const speakers = members.filter((m) => m.role === 'SPEAKER');
  const listeners = members.filter((m) => m.role === 'LISTENER');

  return (
    <div className="max-w-5xl w-full mx-auto px-4 py-8 flex flex-col gap-6 relative min-h-[calc(100vh-140px)] pb-24">
      {/* 1. Real-time Gift Overlay Alert */}
      {activeGiftAlert && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-pink-500/90 to-violet-600/90 text-white px-6 py-3.5 rounded-full border border-pink-400 shadow-2xl flex items-center gap-3 animate-bounce">
          <Sparkles className="h-5 w-5 text-amber-300 animate-spin" />
          <span className="text-xs font-black">
            <span className="text-amber-200">@{activeGiftAlert.sender}</span> sent{' '}
            <span className="text-amber-200">{activeGiftAlert.quantity}x {activeGiftAlert.giftName}</span> to{' '}
            <span className="text-amber-200">@{activeGiftAlert.receiver}</span>! 🎁
          </span>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex justify-between items-center bg-slate-950/20 border-b border-slate-900 pb-5">
        <div className="text-left">
          <h2 className="text-lg font-black text-slate-200 flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-indigo-400" /> {room?.title}
          </h2>
          <p className="text-slate-500 text-xs mt-1">{room?.description || 'Broadcasting live voice...'}</p>
        </div>

        <div className="flex gap-2">
          {isHost ? (
            <Button variant="secondary" onClick={handleCloseRoom} className="h-9 px-4 rounded-xl text-xs font-bold border-rose-950/40 text-rose-400 hover:bg-rose-950/10">
              End Lounge
            </Button>
          ) : (
            <Button variant="secondary" onClick={handleLeave} className="h-9 px-4 rounded-xl text-xs font-bold">
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> Leave
            </Button>
          )}
        </div>
      </div>

      {/* Speakers Stage (Premium Seat Circle Layout) */}
      <Card className="p-6 border-slate-900 bg-slate-950/40 rounded-2xl flex flex-col gap-6">
        <div className="text-left"><span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Speakers Stage</span></div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6 justify-center">
          {/* HOST & CO-HOST CHAIRS */}
          {hosts.map((host) => (
            <div key={host.userId} className="flex flex-col items-center gap-2 group relative">
              <div className="relative">
                <Avatar
                  fallback={host.user.username.substring(0, 2).toUpperCase()}
                  size="lg"
                  className={`border-2 ${
                    host.isSpeaking ? 'border-indigo-500 animate-pulse scale-105' : 'border-indigo-950'
                  }`}
                />
                <Badge variant="primary" className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] px-1.5">
                  Host
                </Badge>
                {host.isMuted && (
                  <div className="absolute -top-1 -right-1 p-1 bg-rose-600 rounded-full border border-slate-950 shadow">
                    <MicOff className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              <span className="text-xs font-bold text-slate-200 truncate max-w-[100px]">
                {host.user.profile?.displayName || host.user.username}
              </span>
            </div>
          ))}

          {/* SPEAKER CHAIRS */}
          {speakers.map((sp) => (
            <div key={sp.userId} className="flex flex-col items-center gap-2 group relative">
              <div className="relative">
                <Avatar
                  fallback={sp.user.username.substring(0, 2).toUpperCase()}
                  size="lg"
                  className={`border-2 ${
                    sp.isSpeaking ? 'border-emerald-500 animate-pulse scale-105' : 'border-slate-800'
                  }`}
                />
                {sp.isMuted && (
                  <div className="absolute -top-1 -right-1 p-1 bg-rose-600 rounded-full border border-slate-950 shadow">
                    <MicOff className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              <span className="text-xs font-bold text-slate-300 truncate max-w-[100px]">
                {sp.user.profile?.displayName || sp.user.username}
              </span>

              {/* Host demote overlay action */}
              {isHost && (
                <button
                  onClick={() => demoteSpeaker(sp.userId)}
                  className="absolute -top-2 -left-2 hidden group-hover:flex bg-slate-900 border border-slate-800 hover:bg-slate-800 p-1 rounded-lg text-slate-400 hover:text-slate-200 active:scale-90"
                  title="Remove Speaker"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Audience Section */}
      <Card className="p-6 border-slate-900 bg-slate-950/20 rounded-2xl flex flex-col gap-4">
        <div className="text-left flex justify-between items-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Listeners ({listeners.length})</span>
        </div>

        {listeners.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-6">No listeners in the audience yet.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {listeners.map((lst) => (
              <div key={lst.userId} className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-900 group relative">
                <Avatar fallback={lst.user.username.substring(0, 2).toUpperCase()} size="sm" />
                <span className="text-xs text-slate-400 font-medium truncate max-w-[80px]">
                  {lst.user.profile?.displayName || lst.user.username}
                </span>
                
                {lst.handRaised && (
                  <Hand className="h-3.5 w-3.5 text-amber-500 animate-bounce" />
                )}

                {/* Host promote popup triggers */}
                {isHost && (
                  <div className="absolute inset-0 bg-slate-900/90 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-all">
                    {lst.handRaised && (
                      <button
                        onClick={() => promoteListener(lst.userId)}
                        className="bg-indigo-600 hover:bg-indigo-500 p-1 rounded-lg text-white"
                        title="Accept Raise Hand"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={() => promoteListener(lst.userId)}
                      className="bg-slate-800 hover:bg-slate-700 p-1 rounded-lg text-slate-300 text-[9px] font-bold px-1.5"
                    >
                      Promote
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Floating Controls Bar at Bottom */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-md border border-slate-850 px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-4 z-40">
        {/* Mute Mic controls (Speakers and Hosts only) */}
        {(isHost || isSpeaker) && (
          <button
            onClick={handleMuteToggle}
            className={`p-3 rounded-full shadow transition-all active:scale-90 ${
              localMuted ? 'bg-rose-600 text-white' : 'bg-slate-850 hover:bg-slate-800 text-slate-350'
            }`}
            title={localMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {localMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        )}

        {/* Raise Hand trigger (Listeners only) */}
        {!isHost && !isSpeaker && (
          <button
            onClick={handleHandRaise}
            className={`p-3 rounded-full shadow transition-all active:scale-90 ${
              currentMember?.handRaised ? 'bg-amber-600 text-white' : 'bg-slate-850 hover:bg-slate-800 text-slate-350'
            }`}
            title={currentMember?.handRaised ? 'Lower Hand' : 'Raise Hand'}
          >
            <Hand className="h-5 w-5" />
          </button>
        )}

        {/* Gift overlay trigger (Everyone) */}
        <button
          onClick={() => setShowGiftDrawer(true)}
          className="p-3 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white shadow shadow-indigo-500/25 transition-all active:scale-90"
          title="Send Virtual Gift"
        >
          <Gift className="h-5 w-5" />
        </button>

        <button onClick={handleLeave} className="p-3 bg-slate-850 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 rounded-full transition-all active:scale-90">
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      {/* Gift Store Drawer Modal */}
      {showGiftDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex justify-end">
          <Card className="w-full max-w-sm h-full border-l border-slate-850 bg-slate-900 rounded-none p-6 flex flex-col justify-between relative shadow-2xl">
            <button onClick={() => setShowGiftDrawer(false)} className="absolute top-4 right-4 p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300">
              <X className="h-4.5 w-4.5" />
            </button>

            <div>
              <h3 className="font-extrabold text-sm text-slate-200 mb-6 flex items-center gap-1.5">
                <Gift className="h-4.5 w-4.5 text-indigo-400" /> Gift Store
              </h3>

              {/* Recipient select */}
              <div className="flex flex-col gap-1.5 text-left mb-6">
                <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Choose Recipient</label>
                <select
                  value={giftRecipientId}
                  onChange={(e) => setGiftRecipientId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs rounded-xl p-3 text-slate-350 focus:outline-none"
                >
                  <option value={room.ownerId}>Room Host (Owner)</option>
                  {members
                    .filter((m) => m.userId !== user?.id && m.role !== 'HOST')
                    .map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user.profile?.displayName || m.user.username} ({m.role.toLowerCase()})
                      </option>
                    ))}
                </select>
              </div>

              {/* Gifts list grid */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">Select Gift</label>
                <div className="grid grid-cols-3 gap-3">
                  {gifts.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedGift(item)}
                      className={`p-3 rounded-xl border cursor-pointer text-center flex flex-col items-center gap-1.5 transition-all ${
                        selectedGift?.id === item.id
                          ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Award className="h-6 w-6 text-amber-500" />
                      <div className="text-[10px] font-bold truncate max-w-full text-slate-200">{item.name}</div>
                      <div className="text-[9px] text-amber-400 font-bold">{item.coinCost} coins</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quantity Select */}
              <div className="flex flex-col gap-1.5 text-left mt-6">
                <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Quantity</label>
                <div className="flex gap-2">
                  {[1, 10, 100].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setGiftQuantity(qty)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        giftQuantity === qty
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {qty}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleSendGift}
              disabled={!selectedGift || !giftRecipientId}
              className="h-11 w-full font-bold text-xs rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600"
            >
              Send Gift ({selectedGift ? selectedGift.coinCost * giftQuantity : 0} coins)
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};
