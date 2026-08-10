import {
  ArrowLeft,
  ArrowUpRight,
  Database,
  MessageSquareText,
  Search,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { projectEntries } from '../data/site';

const pipeline = [
  {
    label: '01 / KNOWLEDGE',
    title: '可信知识',
    detail: '个人档案、职业经历、项目与已发布博客进入统一知识源。',
    icon: Database,
  },
  {
    label: '02 / RETRIEVAL',
    title: '混合检索',
    detail: '开源 Embedding 语义召回与全文检索并行，再通过 RRF 融合。',
    icon: Search,
  },
  {
    label: '03 / GENERATION',
    title: '有据回答',
    detail: '模型只使用命中片段生成内容，并把原始来源一并交给访客。',
    icon: MessageSquareText,
  },
];

export const ProjectPlaceholder = () => {
  const project = projectEntries[0];

  return (
    <main className="projects-page">
      <header className="projects-topbar">
        <Link to="/" className="projects-back">
          <ArrowLeft aria-hidden="true" />
          返回首页
        </Link>
        <span>SELECTED WORK / 2026</span>
      </header>

      <section className="projects-hero">
        <div className="projects-index">PROJECT 001</div>
        <div className="projects-hero-grid">
          <div>
            <p className="projects-kicker"><Sparkles aria-hidden="true" /> AI ENGINEERING</p>
            <h1>{project.title}</h1>
          </div>
          <div className="projects-summary">
            <p>{project.summary}</p>
            <span>{project.role}</span>
          </div>
        </div>
      </section>

      <section className="projects-pipeline" aria-labelledby="projects-pipeline-title">
        <div className="projects-section-heading">
          <span>HOW IT WORKS</span>
          <h2 id="projects-pipeline-title">不是一个聊天壳，<br />而是一条可验证的 RAG 链路。</h2>
        </div>
        <ol>
          {pipeline.map(({ label, title, detail, icon: Icon }) => (
            <li key={label}>
              <div className="projects-step-icon"><Icon aria-hidden="true" /></div>
              <span>{label}</span>
              <h3>{title}</h3>
              <p>{detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="projects-details">
        <div>
          <span className="projects-detail-label">IMPLEMENTATION</span>
          <ul>
            {project.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
          </ul>
        </div>
        <div>
          <span className="projects-detail-label">STACK</span>
          <div className="projects-tech">
            {project.technologies.map((technology) => <span key={technology}>{technology}</span>)}
          </div>
        </div>
      </section>

      <section className="projects-archive" aria-labelledby="projects-archive-title">
        <div className="projects-archive-heading">
          <span>WORK & OPEN SOURCE</span>
          <h2 id="projects-archive-title">从复杂业务系统到开发者工具。</h2>
          <p>项目覆盖 AI 办公产品、腾讯云 ToB 系统、在线代码运行、Vite 插件与低代码编辑器。</p>
        </div>
        <div className="projects-archive-grid">
          {projectEntries.slice(1).map((entry, index) => {
            const external = entry.url.startsWith('http');
            return (
              <a
                className="projects-card"
                href={entry.url}
                key={entry.slug}
                target={external ? '_blank' : undefined}
                rel={external ? 'noreferrer' : undefined}
              >
                <div className="projects-card-top">
                  <span>{String(index + 2).padStart(2, '0')}</span>
                  <ArrowUpRight aria-hidden="true" />
                </div>
                <h3>{entry.title}</h3>
                <p className="projects-card-role">{entry.role}</p>
                <p className="projects-card-summary">{entry.summary}</p>
                <ul>
                  {entry.highlights.slice(0, 2).map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
                <div className="projects-card-tech">
                  {entry.technologies.slice(0, 4).map((technology) => (
                    <span key={technology}>{technology}</span>
                  ))}
                </div>
              </a>
            );
          })}
        </div>
      </section>

      <footer className="projects-footer">
        <span>LUXUDONG / SELECTED WORK</span>
        <Link to="/blog">继续阅读博客 →</Link>
      </footer>
    </main>
  );
};
