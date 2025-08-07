"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/infrastructure/firebase/config"; // Importa da qui

export default function useProtection() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/sign-in");
      } else {
    //padiglione D, primo piano ricoveri privati nstanza 110
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  return  loading ;
}
