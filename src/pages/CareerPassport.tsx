import {
  motion,
  type MotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { careerEntries, type CareerEntry } from '../data/site';

type CareerSheetProps = {
  entry: CareerEntry;
  index: number;
  progress: MotionValue<number>;
};

const CareerSheet = ({ entry, index, progress }: CareerSheetProps) => {
  const pageCount = careerEntries.length;
  const segment = 1 / (pageCount - 1);
  const start = index * segment;
  const end = start + segment;
  const rotateY = useTransform(progress, [start, end], [0, index === pageCount - 1 ? 0 : -112]);
  const x = useTransform(progress, [start, end], ['0%', index === pageCount - 1 ? '0%' : '-5%']);
  const opacity = useTransform(progress, [start, end], [1, index === pageCount - 1 ? 1 : 0.18]);

  return (
    <motion.article
      className="career-sheet"
      style={{ rotateY, x, opacity, zIndex: pageCount - index }}
      data-page-index={index}
    >
      <div className="career-sheet-left">
        <p className="career-kicker">{entry.kicker}</p>
        <strong className="career-number" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </strong>
        <div className="career-identity">
          <p className="career-meta">{entry.meta}</p>
          {index === 0 ? (
            <h1 className="career-title">{entry.title}</h1>
          ) : (
            <h2 className="career-title">{entry.title}</h2>
          )}
          <p className="career-entity">{entry.entity}</p>
          <p className="career-location">{entry.location}</p>
        </div>
      </div>

      <div className="career-sheet-right">
        <p className="career-lead">{entry.lead}</p>
        <div className="career-editorial-grid">
          <div className="career-facts">
            {entry.facts.map((fact) => (
              <div className="career-fact" key={fact.label}>
                <p className="career-section-label">{fact.label}</p>
                <p>{fact.value}</p>
              </div>
            ))}
          </div>
          <div className="career-visual" aria-label={entry.visualLabel}>
            {entry.visual}
          </div>
        </div>
        <footer className="career-footer">
          <div className="career-tags">
            {entry.tags.map((tag) => <span className="career-tag" key={tag}>{tag}</span>)}
          </div>
          <p className="career-footer-note">{entry.note}</p>
        </footer>
      </div>
    </motion.article>
  );
};

export const CareerPassport = () => {
  const pinRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const { scrollYProgress } = useScroll({
    target: pinRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (window.innerWidth <= 760 || reduceMotion) return;
    setActiveIndex(Math.min(careerEntries.length - 1, Math.round(latest * (careerEntries.length - 1))));
  });

  useEffect(() => {
    if (window.innerWidth > 760) return;
    const sheets = Array.from(document.querySelectorAll<HTMLElement>('.career-sheet'));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveIndex(Number((entry.target as HTMLElement).dataset.pageIndex));
          }
        });
      },
      { threshold: 0.45 },
    );
    sheets.forEach((sheet) => observer.observe(sheet));
    return () => observer.disconnect();
  }, []);

  const goToPage = (index: number) => {
    if (window.innerWidth <= 760 || reduceMotion) {
      const sheet = document.querySelector<HTMLElement>(`.career-sheet[data-page-index="${index}"]`);
      sheet?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      return;
    }

    const pin = pinRef.current;
    if (!pin) return;
    const top = pin.getBoundingClientRect().top + window.scrollY;
    const travel = pin.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: top + travel * (index / (careerEntries.length - 1)),
      behavior: 'smooth',
    });
  };

  return (
    <main className="career-page">
      <header className="career-topbar">
        <Link className="career-back" to="/"><span aria-hidden="true">←</span><span>返回首页</span></Link>
        <div className="career-brand" aria-label="页面主题">
          <strong>Career</strong><span>Passport</span><span>Journey</span>
        </div>
        <div className="career-page-count" aria-live="polite">
          <strong>{String(activeIndex + 1).padStart(2, '0')}</strong>
          <span>/</span>
          <span>{String(careerEntries.length).padStart(2, '0')}</span>
        </div>
      </header>

      <aside className="career-rail" aria-label="档案页导航">
        {careerEntries.map((entry, index) => (
          <button
            className={`career-dot${index === activeIndex ? ' is-active' : ''}`}
            type="button"
            key={entry.kicker}
            onClick={() => goToPage(index)}
            aria-label={`前往档案第 ${index + 1} 页`}
            aria-current={index === activeIndex ? 'page' : undefined}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
          </button>
        ))}
      </aside>

      <section className="career-pin" ref={pinRef}>
        <div className="career-stage">
          <motion.div
            className="career-book"
            aria-label="打开的职业档案册"
            initial={reduceMotion ? false : { opacity: 0, y: 32, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            {careerEntries.map((entry, index) => (
              <CareerSheet entry={entry} index={index} progress={scrollYProgress} key={entry.kicker} />
            ))}
          </motion.div>
        </div>
      </section>

      <p className="career-hint">向下滚动 · 翻阅档案</p>
      <div className="career-progress" aria-hidden="true">
        <motion.span style={{ scaleX: scrollYProgress }} />
      </div>
    </main>
  );
};
