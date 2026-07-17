import { motion, useReducedMotion, useScroll } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Counter } from '../components/mdx/Counter';
import { getPostBySlug, type Post } from '../utils/mdx';

const MarkdownBody = ({ body }: { body: string }) => {
  const parts = body.split(/\n?:::counter\n?/g);

  return parts.map((part, index) => (
    <div key={`${index}-${part.slice(0, 16)}`}>
      {part && <ReactMarkdown remarkPlugins={[remarkGfm]}>{part}</ReactMarkdown>}
      {index < parts.length - 1 && <Counter />}
    </div>
  ));
};

export const BlogPost = () => {
  const { id } = useParams();
  const [post, setPost] = useState<Post>();
  const [resolved, setResolved] = useState(false);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    let active = true;
    setResolved(false);

    if (!id) {
      setResolved(true);
      return () => { active = false; };
    }

    getPostBySlug(id).then((nextPost) => {
      if (active) {
        setPost(nextPost);
        setResolved(true);
      }
    });

    return () => { active = false; };
  }, [id]);

  if (!resolved) {
    return <main className="article-state">正在读取文章…</main>;
  }

  if (!post) {
    return (
      <main className="article-state">
        <p>没有找到这篇文章。</p>
        <Link to="/blog">返回博客</Link>
      </main>
    );
  }

  const Component = post.component;

  return (
    <article className="article-view">
      <div className="article-progress" aria-hidden="true">
        <motion.span style={{ scaleX: scrollYProgress }} />
      </div>

      <div className="article-shell">
        <Link className="article-back" to="/blog">
          <ArrowLeft aria-hidden="true" />
          返回
        </Link>

        <motion.header
          className="article-header"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <h1>{post.title}</h1>
          <div className="article-meta">{post.date || '日期待补充'} · {post.readTime || '阅读时长待补充'}</div>
        </motion.header>

        <motion.div
          className="article-body"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.08 }}
        >
          {post.body ? <MarkdownBody body={post.body} /> : Component ? <Component /> : null}
        </motion.div>
      </div>
    </article>
  );
};
