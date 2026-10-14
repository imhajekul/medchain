'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import './AmbientGlowCursor.css';

export default function AmbientGlowCursor() {
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [clickRings, setClickRings] = useState([]);

  const dotRef = useRef(null);
  const auraRef = useRef(null);
  const mousePos = useRef({ x: -100, y: -100 });
  const auraPos = useRef({ x: -100, y: -100 });
  const rafId = useRef(null);

  // Check pointer capability and motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isTouch && !prefersReducedMotion) {
      setEnabled(true);
    }
  }, []);

  // Smooth aura animation loop
  const animate = useCallback(() => {
    // Aura follows with subtle spring interpolation
    const ease = isHovered ? 0.35 : 0.22;
    auraPos.current.x += (mousePos.current.x - auraPos.current.x) * ease;
    auraPos.current.y += (mousePos.current.y - auraPos.current.y) * ease;

    if (auraRef.current) {
      auraRef.current.style.transform = `translate3d(${auraPos.current.x}px, ${auraPos.current.y}px, 0) translate(-50%, -50%)`;
    }

    rafId.current = requestAnimationFrame(animate);
  }, [isHovered]);

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;

      if (!visible) setVisible(true);

      // Strict tracking for central dot
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      }

      // Check if hovering interactive button elements
      const target = e.target;
      if (target) {
        const interactive = target.closest('button, .btn, a, [role="button"], input[type="submit"], input[type="button"]');
        setIsHovered(Boolean(interactive));
      }
    };

    const handleMouseLeave = () => {
      setVisible(false);
      setIsHovered(false);
    };

    const handleMouseEnter = () => {
      setVisible(true);
    };

    // Expanding click ring particle
    const handleMouseDown = (e) => {
      const ringId = Date.now() + Math.random();
      const x = e.clientX;
      const y = e.clientY;

      setClickRings((prev) => [...prev, { id: ringId, x, y }]);

      setTimeout(() => {
        setClickRings((prev) => prev.filter((r) => r.id !== ringId));
      }, 300);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mouseenter', handleMouseEnter);
    window.addEventListener('mousedown', handleMouseDown);

    rafId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mouseenter', handleMouseEnter);
      window.removeEventListener('mousedown', handleMouseDown);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [enabled, visible, animate]);

  if (!enabled) return null;

  return (
    <div className={`ambient-cursor-root ${visible ? '' : 'cursor-hidden'}`} aria-hidden="true">
      {/* 1. Soft Radial-Gradient Aura */}
      <div
        ref={auraRef}
        className={`ambient-cursor-aura ${isHovered ? 'aura-hovered' : ''}`}
      />

      {/* 2. Central Dot with Crosshair on hover */}
      <div
        ref={dotRef}
        className={`ambient-cursor-dot ${isHovered ? 'dot-hovered' : ''}`}
      >
        {isHovered && (
          <>
            <span className="ambient-crosshair-line ambient-crosshair-h" />
            <span className="ambient-crosshair-line ambient-crosshair-v" />
          </>
        )}
      </div>

      {/* 3. Expanding Click Ring Particles */}
      {clickRings.map((ring) => (
        <span
          key={ring.id}
          className="ambient-click-ring"
          style={{
            left: `${ring.x}px`,
            top: `${ring.y}px`
          }}
        />
      ))}
    </div>
  );
}
