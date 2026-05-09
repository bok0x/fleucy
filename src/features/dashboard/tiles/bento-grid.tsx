'use client';

import { motion } from 'framer-motion';

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07 },
  },
};

export const tileVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 280, damping: 22 },
  },
};

export function BentoGrid({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="grid gap-4 grid-cols-1 md:grid-cols-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export function BentoTile({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      variants={tileVariants}
      whileHover={{ y: -3, boxShadow: '0 20px 40px var(--color-glow)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={[
        'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 overflow-hidden',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {children}
    </motion.div>
  );
}
