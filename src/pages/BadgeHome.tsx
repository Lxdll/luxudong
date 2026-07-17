import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';
import badgeAvatar96 from '../assets/avatar-noir-badge-96.png';
import badgeAvatar192 from '../assets/avatar-noir-badge-192.png';
import badgeAvatar384 from '../assets/avatar-noir-badge-384.png';
import { SiteDock } from '../components/SiteDock';

export const BadgeHome = () => {
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const insertX = useSpring(pointerX, { stiffness: 140, damping: 22 });
  const insertY = useSpring(pointerY, { stiffness: 140, damping: 22 });

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduceMotion || window.innerWidth <= 720) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 7);
    pointerY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 7);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <main className="badge-home">
      <div className="badge-type-field" aria-hidden="true">
        <motion.span
          className="badge-type-word"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.92, x: '-50%', y: '-50%' }}
          animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          FRONTEND
        </motion.span>
        <span className="badge-coordinate badge-coordinate-a">X 050 / Y 043<br />INTERFACE FIELD</span>
        <span className="badge-coordinate badge-coordinate-b">PORTFOLIO SYSTEM<br />IDENTITY 001</span>
      </div>

      <section className="badge-section" aria-labelledby="badge-name">
        <div className="badge-container badge-hero-layout">
          <div
            className="badge-stage"
            onPointerMove={handlePointerMove}
            onPointerLeave={resetPointer}
            aria-label="分层装配的立体个人工牌"
          >
            <motion.div
              className="badge-lanyard"
              initial={reduceMotion ? false : { x: '-50%', y: -190, rotateX: 5, opacity: 0 }}
              animate={{ x: '-50%', y: 0, rotateX: 5, opacity: 1 }}
              transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
              aria-hidden="true"
            >
              <span className="badge-lanyard-stitch" />
            </motion.div>

            <motion.div
              className="badge-clasp"
              initial={reduceMotion ? false : { x: '-50%', z: 28, scale: 0.88, opacity: 0 }}
              animate={{ x: '-50%', z: 28, scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.28 }}
              aria-hidden="true"
            />

            <motion.div
              className="badge-rig"
              initial={reduceMotion ? false : { x: '-50%', scale: 0.98, opacity: 0 }}
              animate={{ x: '-50%', scale: 1, opacity: 1 }}
              transition={{ duration: 0.72, delay: 0.35 }}
            >
              <div className="badge-shadow" aria-hidden="true" />
              <article className="badge-shell">
                <span className="badge-slot" aria-hidden="true" />
                <motion.div className="badge-insert" style={{ x: insertX, y: insertY, z: 8 }}>
                  <div className="badge-top">
                    <p className="badge-kicker">个人档案</p>
                    <p className="badge-number">NO. 001</p>
                  </div>

                  <div className="badge-portrait">
                    <img
                      className="badge-portrait-image"
                      src={badgeAvatar96}
                      srcSet={`${badgeAvatar96} 96w, ${badgeAvatar192} 192w, ${badgeAvatar384} 384w`}
                      sizes="(max-width: 760px) 62px, 74px"
                      width="74"
                      height="74"
                      alt="鲁旭东的头像"
                      decoding="async"
                      draggable={false}
                    />
                  </div>

                  <h1 className="badge-name" id="badge-name">鲁旭东</h1>
                  <p className="badge-role">Frontend Engineer / Web Creator</p>

                  <div className="badge-actions">
                    <Link className="badge-action" to="/projects">项目展示</Link>
                    <Link className="badge-action" to="/career">工作经历</Link>
                  </div>

                  <div className="badge-footer">
                    <span>ACCESS / PORTFOLIO</span>
                    <span>2026</span>
                  </div>
                </motion.div>
              </article>
            </motion.div>
          </div>
        </div>
      </section>

      <SiteDock />
    </main>
  );
};
