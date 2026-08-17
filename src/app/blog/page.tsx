import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "@/lib/blog-posts";

export const metadata: Metadata = {
  title: "Money tips for couples & families",
  description: "Practical, judgement-free guides on budgeting, saving, and managing money together.",
  alternates: { canonical: "/blog" },
};

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function BlogIndex() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <Link className="lp-brand" href="/"><img src="/brand-emblem.png" alt="" className="lp-brand-mark" /><span>Budget <b>Tracker</b></span></Link>
        <nav className="lp-nav-actions"><a className="lp-link" href="/login">Sign in</a><a className="lp-cta lp-cta-primary" href="/login?mode=signup">Get started free</a></nav>
      </header>
      <section className="lp-section blog-index">
        <h1>The Budget Tracker blog</h1>
        <p className="lp-sub">Practical, judgement-free money guides for couples and families.</p>
        <div className="blog-list">
          {BLOG_POSTS.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="blog-card">
              <span className="blog-tag">{post.tag}</span>
              <strong>{post.title}</strong>
              <p>{post.description}</p>
              <span className="blog-meta">{fmt(post.date)} · {post.readMins} min read</span>
            </Link>
          ))}
        </div>
      </section>
      <footer className="lp-footer">
        <Link className="lp-brand" href="/"><img src="/brand-emblem.png" alt="" className="lp-brand-mark" /><span>Budget <b>Tracker</b></span></Link>
        <nav className="lp-footer-links"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/login">Sign in</a></nav>
      </footer>
    </div>
  );
}
