import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '../core/api-client';
import { useSocket } from '../core/SocketContext';
import { useAuth } from '../core/AuthContext';
import { Card, Input, Button, Avatar, Badge } from '@voicesphere/ui';
import { Send, Trash, ArrowLeft, RefreshCw, MessageSquare } from 'lucide-react';

interface Participant {
  id: string;
  username: string;
  avatarUrl?: string;
  displayName?: string;
  isOnline: boolean;
}

interface Conversation {
  id: string;
  type: string;
  unreadCount: number;
  otherParticipant: Participant;
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
  };
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export const Chats: React.FC = () => {
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [typing, setTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchConversations = async () => {
    try {
      const res = await apiClient.get('/conversations');
      setConversations(res.data);
      
      // Join WebSocket channels
      if (socket && res.data.length > 0) {
        const ids = res.data.map((c: Conversation) => c.id);
        socket.emit('chat:join_conversations', { conversationIds: ids });
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoadingConv(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    setLoadingMsg(true);
    try {
      const res = await apiClient.get(`/conversations/${convId}/messages`);
      // API returns messages descending, reverse to chronological for chat UI
      setMessages(res.data.reverse());
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoadingMsg(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    // Listen for incoming message
    socket.on('chat:message', (message: Message) => {
      // Append if it belongs to active chat
      if (activeConversation && message.conversationId === activeConversation.id) {
        setMessages((prev) => [...prev, message]);
        // Send read receipt
        socket.emit('chat:read', {
          conversationId: activeConversation.id,
          lastReadMessageId: message.id,
        });
      } else {
        // Increment unread count in listings
        setConversations((prev) =>
          prev.map((c) =>
            c.id === message.conversationId
              ? {
                  ...c,
                  unreadCount: c.unreadCount + 1,
                  lastMessage: {
                    id: message.id,
                    content: message.content,
                    senderId: message.senderId,
                    createdAt: message.createdAt,
                  },
                }
              : c
          )
        );
      }
    });

    // Listen for typing events
    socket.on('chat:typing', (data: { conversationId: string }) => {
      if (activeConversation && data.conversationId === activeConversation.id) {
        setOtherTyping(true);
      }
    });

    socket.on('chat:stop_typing', (data: { conversationId: string }) => {
      if (activeConversation && data.conversationId === activeConversation.id) {
        setOtherTyping(false);
      }
    });

    // Listen for message deletion
    socket.on('chat:message_deleted', (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    });

    // Listen for online status updates
    socket.on('user:online', (data: { userId: string }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.otherParticipant.id === data.userId
            ? { ...c, otherParticipant: { ...c.otherParticipant, isOnline: true } }
            : c
        )
      );
    });

    socket.on('user:offline', (data: { userId: string }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.otherParticipant.id === data.userId
            ? { ...c, otherParticipant: { ...c.otherParticipant, isOnline: false } }
            : c
        )
      );
    });

    return () => {
      socket.off('chat:message');
      socket.off('chat:typing');
      socket.off('chat:stop_typing');
      socket.off('chat:message_deleted');
      socket.off('user:online');
      socket.off('user:offline');
    };
  }, [socket, activeConversation]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping]);

  const selectConversation = (conv: Conversation) => {
    setActiveConversation(conv);
    fetchMessages(conv.id);
    setOtherTyping(false);

    // Clear unread local state
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
    );

    // Send read receipt if last message exists
    if (socket && conv.lastMessage) {
      socket.emit('chat:read', {
        conversationId: conv.id,
        lastReadMessageId: conv.lastMessage.id,
      });
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation) return;

    const text = inputText;
    setInputText('');
    
    // Stop typing immediately
    if (socket) {
      socket.emit('chat:stop_typing', { conversationId: activeConversation.id });
    }
    setTyping(false);

    try {
      const res = await apiClient.post(`/conversations/${activeConversation.id}/messages`, {
        content: text,
        messageType: 'TEXT',
      });
      // Append sender message locally
      setMessages((prev) => [...prev, res.data]);
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!socket || !activeConversation) return;

    if (!typing) {
      setTyping(true);
      socket.emit('chat:typing', { conversationId: activeConversation.id });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:stop_typing', { conversationId: activeConversation.id });
      setTyping(false);
    }, 2000);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      await apiClient.delete(`/conversations/${activeConversation!.id}/messages/${messageId}`);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      alert('Delete permission denied');
    }
  };

  return (
    <div className="max-w-6xl w-full mx-auto px-4 py-8 flex gap-6 h-[calc(100vh-120px)]">
      {/* Conversations List Panel */}
      <Card
        className={`flex-col border-slate-900 bg-slate-950/60 backdrop-blur-md rounded-2xl w-full md:w-1/3 overflow-hidden ${
          activeConversation ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-5 border-b border-slate-900 flex justify-between items-center bg-slate-950/20">
          <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
            <MessageSquare className="h-4.5 w-4.5 text-indigo-400" /> Private Chats
          </h2>
          <span className="text-[10px] text-slate-500 font-mono">
            {connected ? 'WS Connected' : 'Connecting...'}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-950 p-2 flex flex-col gap-1">
          {loadingConv ? (
            <div className="text-center text-slate-500 py-10 flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
              <span className="text-xs">Loading conversations...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-slate-500 py-16 flex flex-col gap-2">
              <span className="text-xs">No active chats</span>
              <span className="text-[10px] text-slate-600">Start chats from profile cards or voice grids.</span>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`flex justify-between items-center p-3 rounded-xl cursor-pointer transition-all ${
                  activeConversation?.id === conv.id
                    ? 'bg-indigo-600/10 border border-indigo-500/20'
                    : 'hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <div className="flex gap-3 items-center min-w-0">
                  <Avatar
                    fallback={conv.otherParticipant.username.substring(0, 2).toUpperCase()}
                    size="md"
                    isOnline={conv.otherParticipant.isOnline}
                  />
                  <div className="text-left min-w-0">
                    <div className="font-bold text-xs text-slate-200 truncate">
                      {conv.otherParticipant.displayName || conv.otherParticipant.username}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 truncate">
                      {conv.lastMessage?.content || 'No messages yet'}
                    </div>
                  </div>
                </div>

                {conv.unreadCount > 0 && (
                  <Badge variant="danger" className="h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full">
                    {conv.unreadCount}
                  </Badge>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Messages Chat Window Panel */}
      <Card
        className={`flex-1 flex-col border-slate-900 bg-slate-950/40 rounded-2xl overflow-hidden ${
          !activeConversation ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeConversation ? (
          <>
            {/* Header bar */}
            <div className="p-4 border-b border-slate-900 bg-slate-950/80 flex items-center gap-3">
              <button
                onClick={() => setActiveConversation(null)}
                className="md:hidden p-1.5 hover:bg-slate-900 rounded-xl text-slate-400"
              >
                <ArrowLeft className="h-4.5 w-4.5" />
              </button>
              
              <Avatar
                fallback={activeConversation.otherParticipant.username.substring(0, 2).toUpperCase()}
                size="sm"
                isOnline={activeConversation.otherParticipant.isOnline}
              />
              <div className="text-left">
                <div className="text-xs font-bold text-slate-200">
                  {activeConversation.otherParticipant.displayName || activeConversation.otherParticipant.username}
                </div>
                <div className="text-[10px] text-slate-500">
                  {activeConversation.otherParticipant.isOnline ? 'Active Now' : 'Offline'}
                </div>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 bg-slate-950/20">
              {loadingMsg ? (
                <div className="text-center text-slate-500 py-10 flex flex-col items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin text-indigo-500" />
                  <span className="text-[10px]">Loading chat history...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-slate-500 my-auto py-10 flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-400">Say Hello Yo! 👋</span>
                  <span className="text-[10px] text-slate-600">Send a message to start this connection.</span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex group ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex flex-col gap-1 max-w-[70%]`}>
                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap text-left break-words shadow-sm relative ${
                            isOwn
                              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-tr-none'
                              : 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-800/80'
                          }`}
                        >
                          {msg.content}
                          
                          {/* Trash delete button */}
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="absolute -top-1 -right-1 hidden group-hover:block bg-slate-950/80 hover:bg-slate-950 text-slate-500 hover:text-rose-400 p-1 rounded-full border border-slate-850 shadow transition-all active:scale-90"
                            title="Delete message"
                          >
                            <Trash className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-[9px] text-slate-500 self-end font-mono">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing bubble */}
              {otherTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-900 text-slate-400 px-4 py-2.5 rounded-2xl rounded-tl-none border border-slate-800/80 text-[10px] flex items-center gap-1.5 animate-pulse">
                    <span>typing</span>
                    <span className="flex gap-0.5"><span className="animate-bounce">•</span><span className="animate-bounce delay-75">•</span><span className="animate-bounce delay-150">•</span></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSend} className="p-4 border-t border-slate-900 bg-slate-950/80 flex gap-2">
              <Input
                placeholder="Type your message..."
                value={inputText}
                onChange={handleInputChange}
                className="flex-1 bg-slate-950 border-slate-900 h-10 text-xs rounded-xl"
              />
              <Button
                variant="primary"
                type="submit"
                disabled={!inputText.trim()}
                className="h-10 w-10 p-0 flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600"
              >
                <Send className="h-4 w-4 text-white" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center p-8 text-center text-slate-500">
            <MessageSquare className="h-10 w-10 text-slate-700 mb-2" />
            <p className="text-sm font-semibold text-slate-400">No Chat Selected</p>
            <p className="text-xs text-slate-600 mt-1">Select a conversation from the sidebar list to view messages.</p>
          </div>
        )}
      </Card>
    </div>
  );
};
