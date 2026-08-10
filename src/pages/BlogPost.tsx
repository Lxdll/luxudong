import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArticleView } from '../components/ArticleView';
import { getPostBySlug, type Post } from '../utils/mdx';

export const BlogPost = () => {
  const { id } = useParams();
  const [post, setPost] = useState<Post>();
  const [resolved, setResolved] = useState(false);
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

  return <ArticleView post={post} />;
};
