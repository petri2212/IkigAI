'use client';

import { useEffect, useState } from 'react';
import { Auth } from 'firebase/auth';

export default function useLazyCreateUser(auth: Auth) {
  const [hook, setHook] = useState<ReturnType<typeof import("react-firebase-hooks/auth").useCreateUserWithEmailAndPassword> | null>(null);

  useEffect(() => {
    (async () => {
      const mod = await import('react-firebase-hooks/auth');
      const hookInstance = mod.useCreateUserWithEmailAndPassword(auth);
      setHook(hookInstance);
    })();
  }, [auth]);

  return hook;
}