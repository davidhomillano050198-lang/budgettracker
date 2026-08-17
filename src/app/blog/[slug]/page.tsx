import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getPost } from "@/lib/blog-posts";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Article not found" };
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: { title: post.title, description: post.description, type: "article", url: `/blog/${slug}`, publishedTime: post.date },
  };
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { "@type": "Organization", name: "Budget Tracker" },
    publisher: { "@type": "Organization", name: "Budget Tracker" },
  };

  return (
    <div className="lp">
      <header className="lp-nav">
        <Link className="lp-brand" href="/"><img src="/brand-emblem.png" alt="" className="lp-brand-mark" /><span>Budget <b>Tracker</b></span></Link>
        <nav className="lp-nav-actions"><a className="lp-link" href="/login">Sign in</a><a className="lp-cta lp-cta-primary" href="/login?mode=signup">Get started free</a></nav>
      </header>

      <article className="blog-article">
        <Link href="/blog" className="blog-back">← All articles</Link>
        <span className="blog-tag">{post.tag}</span>
        <h1>{post.title}</h1>
        <p className="blog-lead">{post.description}</p>
        <span className="blog-meta">{fmt(post.date)} · {post.readMins} min read</span>
        {post.sections.map((section, i) => (
          <section key={i} className="blog-body-section">
            {section.heading && <h2>{section.heading}</h2>}
            {section.paragraphs.map((para, j) => <p key={j}>{para}</p>)}
            {section.bullets && <ul>{section.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
          </section>
        ))}
        <div className="blog-cta">
          <h3>Ready to try it?</h3>
          <p>Set up your household in about two minutes — free forever, no credit card.</p>
          <a className="lp-cta lp-cta-primary" href="/login?mode=signup">Get started free</a>
        </div>
      </article>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <footer className="lp-footer">
        <Link className="lp-brand" href="/"><img src="/brand-emblem.png" alt="" className="lp-brand-mark" /><span>Budget <b>Tracker</b></span></Link>
        <nav className="lp-footer-links"><Link href="/blog">Blog</Link><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav>
      </footer>
    </div>
  );
}
