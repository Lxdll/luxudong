import { motion, useReducedMotion, useScroll } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Counter } from './mdx/Counter';
import type { Post } from '../utils/mdx';

const MarkdownBody = ({ body }: { body: string }) => {
  const parts = body.split(/\n?:::counter\n?/g);

  return parts.map((part, index) => (
    <div key={`${index}-${part.slice(0, 16)}`}>
      {part && <ReactMarkdown remarkPlugins={[remarkGfm]}>{part}</ReactMarkdown>}
      {index < parts.length - 1 && <Counter />}
    </div>
  ));
};

type ArticleViewProps = {
  post: Post;
  preview?: boolean;
  version?: string;
};

export const ArticleView = ({ post, preview = false, version = 'main' }: ArticleViewProps) => {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const Component = post.component;

  return (
    <article className="article-view">
      <div className="article-progress" aria-hidden="true">
        <motion.span style={{ scaleX: scrollYProgress }} />
      </div>

      <div className="article-shell">
        {preview ? (
          <div className="article-preview-status" role="status">
            <span>草稿预览</span>
            <span>{version === 'main' ? '主版本' : `版本：${version}`}</span>
          </div>
        ) : (
          <Link className="article-back" to="/blog">
            <ArrowLeft aria-hidden="true" />
            返回
          </Link>
        )}

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
