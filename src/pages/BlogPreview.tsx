import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ArticleView } from '../components/ArticleView';
import { getPreviewPostById, type Post } from '../utils/mdx';

const grantStorageKey = (id: string, version: string) => `cms-preview:${id}:${version}`;

const readPreviewGrant = (id: string, version: string) => {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const grant = hash.get('grant');

  if (grant) {
    sessionStorage.setItem(grantStorageKey(id, version), grant);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    return grant;
  }

  return sessionStorage.getItem(grantStorageKey(id, version));
};

export const BlogPreview = () => {
  const { id } = useParams();
  const location = useLocation();
  const version = new URLSearchParams(location.search).get('version') || 'main';
  const [post, setPost] = useState<Post>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    if (!id) {
      setLoading(false);
      setError('缺少文章 ID。');
      return () => { active = false; };
    }

    const grant = readPreviewGrant(id, version);
    if (!grant) {
      setLoading(false);
      setError('预览凭证不存在，请返回 Directus 重新打开预览。');
      return () => { active = false; };
    }

    getPreviewPostById(id, version, grant)
      .then((nextPost) => {
        if (active) setPost(nextPost);
      })
      .catch((previewError: unknown) => {
        if (!active) return;
        const message = previewError instanceof Error ? previewError.message : '无法读取草稿。';
        setError(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [id, version]);

  if (loading) {
    return <main className="article-state">正在读取草稿预览…</main>;
  }

  if (error || !post) {
    return (
      <main className="article-state article-preview-error">
        <p>{error || '没有找到这篇草稿。'}</p>
        <span>关闭预览后，从 Directus 文章页重新打开即可刷新凭证。</span>
      </main>
    );
  }

  return <ArticleView post={post} preview version={version} />;
};
