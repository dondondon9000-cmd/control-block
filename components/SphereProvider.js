'use client';

import { createContext, useContext, useState } from 'react';

const SphereContext = createContext(null);

export function SphereProvider({ children }) {
  const [sphereState, setSphereState] = useState('idle');
  const [amplitude, setAmplitude] = useState(0);
  const [emotion, setEmotion] = useState(null);

  return (
    <SphereContext.Provider
      value={{ sphereState, setSphereState, amplitude, setAmplitude, emotion, setEmotion }}
    >
      {children}
    </SphereContext.Provider>
  );
}

export function useSphere() {
  const ctx = useContext(SphereContext);
  if (!ctx) throw new Error('useSphere must be used within a SphereProvider');
  return ctx;
}
