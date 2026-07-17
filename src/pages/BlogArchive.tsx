import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { blogCategories } from '../data/site';
import { getAllPosts, type Post } from '../utils/mdx';

export const BlogArchive = () => {
  const reduceMotion = useReducedMotion();
  const [posts, setPosts] = useState<Post[]>([]);
  const [category, setCategory] = useState('全部');

  useEffect(() => {
    getAllPosts().then(setPosts);
  }, []);

  const categories = useMemo(() => {
    const known = new Set(blogCategories);
    const extras = posts.map((post) => post.category).filter((item) => !known.has(item));
    return [...blogCategories, ...extras];
  }, [posts]);

  const visiblePosts = category === '全部'
    ? posts
    : posts.filter((post) => post.category === category);

  return (
    <main className="blog-page">
      <Link className="blog-home-link" to="/" aria-label="返回首页">
        <span className="blog-home-brand" aria-hidden="true">Luxudong</span>
        <span className="blog-home-label" aria-hidden="true">← 返回首页</span>
      </Link>

      <div className="blog-layout">
        <motion.aside
          className="blog-categories"
          aria-label="博客分类"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.48 }}
        >
          <ol className="blog-category-list">
            {categories.map((item) => (
              <li key={item}>
                <button
                  className={`blog-category-button${category === item ? ' is-active' : ''}`}
                  type="button"
                  onClick={() => setCategory(item)}
                  aria-pressed={category === item}
                >
                  {item}
                </button>
              </li>
            ))}
          </ol>
        </motion.aside>

        <section aria-label="文章列表">
          {visiblePosts.length > 0 ? (
            <motion.ol
              className="blog-post-list"
              key={category}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.32 }}
            >
              {visiblePosts.map((post) => (
                <li key={post.id}>
                  <Link className="blog-post-link" to={`/blog/${post.slug}`}>
                    <h2 className="blog-post-title">{post.title}</h2>
                    <div className="blog-post-meta">
                      <span className="blog-post-date">{post.date || '日期待补充'}</span>
                      <span className="blog-post-duration">· {post.readTime || '阅读时长待补充'}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </motion.ol>
          ) : (
            <div className="blog-empty">这个分类暂时没有文章。</div>
          )}
        </section>
      </div>
    </main>
  );
};
