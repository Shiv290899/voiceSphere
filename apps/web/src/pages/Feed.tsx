import React, { useEffect, useState } from 'react';
import { apiClient } from '../core/api-client';
import { Card, Button, Input, Badge, Avatar } from '@voicesphere/ui';
import { Heart, MessageCircle, Send, Globe, Users, Lock, Upload, Volume2, RefreshCw, Trash, Newspaper } from 'lucide-react';

interface Media {
  id: string;
  type: string;
  url: string;
  metadata?: string;
}

interface Post {
  id: string;
  content: string;
  visibility: string;
  createdAt: string;
  isLiked: boolean;
  author: {
    id: string;
    username: string;
    avatarUrl?: string;
    profile?: {
      displayName?: string;
    };
  };
  media?: Media[];
  comments: any[];
  _count: {
    likes: number;
    comments: number;
  };
}

export const Feed: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'>('PUBLIC');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<{ url: string; type: string }[]>([]);
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const fetchPosts = async () => {
    try {
      const res = await apiClient.get('/posts/feed');
      setPosts(res.data);
    } catch (err) {
      console.error('Error fetching feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'AUDIO') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await apiClient.post(`/uploads/file?type=${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadedMedia([...uploadedMedia, { url: res.data.url, type }]);
    } catch (err) {
      alert('File upload failed. Ensure size limit is within bounds.');
    } finally {
      setUploading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && uploadedMedia.length === 0) return;

    try {
      await apiClient.post('/posts', {
        content,
        visibility,
        media: uploadedMedia,
      });
      setContent('');
      setUploadedMedia([]);
      fetchPosts();
    } catch (err) {
      console.error('Error creating post:', err);
    }
  };

  const handleLike = async (post: Post) => {
    try {
      if (post.isLiked) {
        await apiClient.delete(`/posts/${post.id}/like`);
      } else {
        await apiClient.post(`/posts/${post.id}/like`);
      }
      // Toggle local state
      setPosts(
        posts.map((p) => {
          if (p.id === post.id) {
            return {
              ...p,
              isLiked: !p.isLiked,
              _count: {
                ...p._count,
                likes: p._count.likes + (p.isLiked ? -1 : 1),
              },
            };
          }
          return p;
        }),
      );
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleComment = async (postId: string) => {
    if (!commentText.trim()) return;

    try {
      await apiClient.post(`/posts/${postId}/comments`, { content: commentText });
      setCommentText('');
      fetchPosts();
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await apiClient.delete(`/posts/${postId}`);
      setPosts(posts.filter((p) => p.id !== postId));
    } catch (err) {
      alert('Delete permission denied');
    }
  };

  const getVisibilityIcon = (scope: string) => {
    if (scope === 'FOLLOWERS') return <Users className="h-3 w-3" />;
    if (scope === 'PRIVATE') return <Lock className="h-3 w-3" />;
    return <Globe className="h-3 w-3" />;
  };

  return (
    <div className="max-w-2xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Create Post Card */}
      <Card className="p-5 border-slate-900 bg-slate-950/60 backdrop-blur-md rounded-2xl">
        <form onSubmit={handleCreatePost} className="flex flex-col gap-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share something with the community..."
            className="w-full min-h-[80px] bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none border-b border-slate-900 pb-3"
          />

          {uploadedMedia.length > 0 && (
            <div className="flex flex-wrap gap-2.5">
              {uploadedMedia.map((m, idx) => (
                <div key={idx} className="relative group bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
                  {m.type === 'AUDIO' ? (
                    <Volume2 className="h-5 w-5 text-indigo-400" />
                  ) : (
                    <img src={`http://localhost:3000${m.url}`} className="h-10 w-10 object-cover rounded-lg" alt="Thumbnail" />
                  )}
                  <span className="text-xs text-slate-400 font-mono truncate max-w-[120px]">
                    {m.url.split('/').pop()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setUploadedMedia(uploadedMedia.filter((_, i) => i !== idx))}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center">
            <div className="flex gap-1.5">
              {/* Image Upload */}
              <label className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl cursor-pointer text-slate-400 hover:text-slate-200 transition-all active:scale-95 flex items-center justify-center">
                <Upload className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'IMAGE')}
                  className="hidden"
                  disabled={uploading}
                />
              </label>

              {/* Audio Upload */}
              <label className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl cursor-pointer text-slate-400 hover:text-slate-200 transition-all active:scale-95 flex items-center justify-center">
                <Volume2 className="h-4 w-4" />
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => handleFileUpload(e, 'AUDIO')}
                  className="hidden"
                  disabled={uploading}
                />
              </label>

              {/* Visibility Select */}
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="bg-slate-900 text-xs text-slate-300 font-semibold border-slate-800 rounded-xl px-3 focus:outline-none"
              >
                <option value="PUBLIC">Public</option>
                <option value="FOLLOWERS">Followers</option>
                <option value="PRIVATE">Private</option>
              </select>
            </div>

            <Button
              variant="primary"
              type="submit"
              disabled={uploading || (!content.trim() && uploadedMedia.length === 0)}
              className="px-5 h-9 rounded-xl font-bold text-xs"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" /> Share Post
            </Button>
          </div>
        </form>
      </Card>

      {/* Feed Timeline */}
      {loading ? (
        <div className="text-center text-slate-500 py-10 flex flex-col items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
          <span className="text-xs">Loading social feed...</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center text-slate-500 py-16 bg-slate-950/20 border border-slate-900 rounded-2xl">
          <Newspaper className="h-8 w-8 mx-auto text-slate-600 mb-2" />
          <p className="text-sm font-semibold">Feed is empty</p>
          <p className="text-xs text-slate-600 mt-1">Be the first to share a post with the community!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {posts.map((post) => (
            <Card key={post.id} className="p-6 border-slate-900 bg-slate-950/40 rounded-2xl flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex gap-3 items-center">
                  <Avatar fallback={post.author.username.substring(0, 2).toUpperCase()} size="md" isOnline={true} />
                  <div>
                    <div className="font-bold text-sm text-slate-200">
                      {post.author.profile?.displayName || post.author.username}
                    </div>
                    <div className="text-[10px] text-slate-500 flex gap-2.5 items-center mt-0.5">
                      <span>@{post.author.username}</span>
                      <span>•</span>
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {getVisibilityIcon(post.visibility)}
                        {post.visibility.toLowerCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeletePost(post.id)}
                  className="p-1 text-slate-600 hover:text-rose-400 transition-all rounded-lg"
                  title="Delete post"
                >
                  <Trash className="h-4 w-4" />
                </button>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {post.content}
              </p>

              {/* Media Attachments */}
              {post.media && post.media.length > 0 && (
                <div className="flex flex-col gap-2.5 mt-1">
                  {post.media.map((media) => {
                    const isAudio = media.type === 'AUDIO';
                    let meta: any = {};
                    if (media.metadata) {
                      try {
                        meta = JSON.parse(media.metadata);
                      } catch (e) {}
                    }

                    return (
                      <div key={media.id} className="bg-slate-950/80 border border-slate-900 p-4 rounded-xl">
                        {isAudio ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                                <Volume2 className="h-4.5 w-4.5" /> Audio Track
                              </span>
                              {meta.status === 'PENDING' ? (
                                <Badge variant="primary" className="animate-pulse">Processing...</Badge>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  Duration: {meta.duration || '0'}s
                                </span>
                              )}
                            </div>
                            {meta.status === 'PROCESSED' && (
                              <audio controls src={`http://localhost:3000${media.url}`} className="w-full mt-2 h-10" />
                            )}
                          </div>
                        ) : (
                          <img src={`http://localhost:3000${media.url}`} className="max-h-[300px] w-full object-cover rounded-xl" alt="Post attachment" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 border-y border-slate-950 py-3 mt-2">
                <button
                  onClick={() => handleLike(post)}
                  className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                    post.isLiked ? 'text-rose-500' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Heart className={`h-4.5 w-4.5 ${post.isLiked ? 'fill-rose-500' : ''}`} />
                  {post._count.likes} Likes
                </button>

                <button
                  onClick={() => setCommentingPostId(commentingPostId === post.id ? null : post.id)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <MessageCircle className="h-4.5 w-4.5" />
                  {post._count.comments} Comments
                </button>
              </div>

              {/* Comments drawer */}
              {commentingPostId === post.id && (
                <div className="flex flex-col gap-3.5 mt-2 bg-slate-950/20 p-4 rounded-xl border border-slate-950">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Write a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="flex-1 bg-slate-950 border-slate-900 h-9 text-xs"
                    />
                    <Button
                      variant="primary"
                      onClick={() => handleComment(post.id)}
                      className="h-9 w-9 rounded-xl flex items-center justify-center p-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>

                  {post.comments && post.comments.length > 0 && (
                    <div className="flex flex-col gap-3 mt-1">
                      {post.comments.map((comment: any) => (
                        <div key={comment.id} className="flex gap-2.5 items-start text-xs border-b border-slate-950 pb-2.5 last:border-b-0 last:pb-0">
                          <Avatar fallback={comment.author.username.substring(0, 2).toUpperCase()} size="sm" />
                          <div className="flex-1">
                            <div className="font-bold text-slate-300">{comment.author.profile?.displayName || comment.author.username}</div>
                            <div className="text-slate-400 mt-1 leading-normal">{comment.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
