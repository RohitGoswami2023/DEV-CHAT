import { useState } from "react";

/**
 * useSwipe Hook
 * @param {Object} callbacks - { onSwipeLeft, onSwipeRight }
 * @param {Number} threshold - Minimum horizontal distance to trigger
 * @param {Number} angleThreshold - Ratio of X distance to Y distance to ensure it's a side swipe (default 2)
 */
export const useSwipe = ({ onSwipeLeft, onSwipeRight }, threshold = 15, angleThreshold = 0.5) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const handleTouchStart = (e) => {
    setTouchEnd(null); // Reset
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchMove = (e) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchEnd = (e) => {
    if (!touchStart) return;

    // Use touchEnd from move OR changedTouches from current event (final position)
    const finalX = touchEnd?.x || e.changedTouches[0].clientX;
    const finalY = touchEnd?.y || e.changedTouches[0].clientY;

    const distanceX = touchStart.x - finalX;
    const distanceY = touchStart.y - finalY;

    // Ensure swipe is horizontal: Math.abs(X) > Math.abs(Y) * angleThreshold
    const isHorizontal = Math.abs(distanceX) > Math.abs(distanceY) * 2.0; // Higher ratio for stricter horizontal swipe
    const isOverThreshold = Math.abs(distanceX) > 40; // Increased from 15

    if (isHorizontal && isOverThreshold) {
      if (distanceX > 0 && onSwipeLeft) {
        onSwipeLeft();
      } else if (distanceX < 0 && onSwipeRight) {
        onSwipeRight();
      }
    }
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};
