import { Flame, Heart, MessageCircle } from "lucide-react";

const posts = [
  { user: "FitNomad", level: 6, streak: 14, likes: 128, comments: 19, note: "7-day consistency streak hit." },
  { user: "ShadowLift", level: 4, streak: 8, likes: 94, comments: 12, note: "Avatar shape improved after clean nutrition week." },
  { user: "Rival_427", level: 7, streak: 21, likes: 160, comments: 25, note: "Back and shoulder posture evolution updated." }
];

export function CommunityFeed() {
  return (
    <section className="grid gap-4">
      <header className="glass-panel rounded-3xl p-5">
        <p className="text-sm text-slate-600">Community</p>
        <h1 className="text-3xl text-slate-900">Anonymous Fitness Community</h1>
        <p className="mt-2 text-slate-700">React, compare, and stay motivated with avatar-only updates.</p>
      </header>

      <div className="grid gap-4">
        {posts.map((post) => (
          <article key={post.user} className="glass-panel rounded-3xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl text-slate-900">{post.user}</h2>
                <p className="text-sm text-slate-700">
                  Level {post.level} • Streak {post.streak} days
                </p>
              </div>
              <span className="rounded-full bg-violet/15 px-3 py-1 text-sm text-violet">
                <Flame className="mr-1 inline" size={14} />
                Active
              </span>
            </div>
            <p className="mb-4 text-slate-800">{post.note}</p>
            <div className="flex items-center gap-4 text-sm text-slate-700">
              <span>
                <Heart className="mr-1 inline" size={14} />
                {post.likes}
              </span>
              <span>
                <MessageCircle className="mr-1 inline" size={14} />
                {post.comments}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
