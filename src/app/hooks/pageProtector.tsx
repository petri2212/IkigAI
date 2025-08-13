"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/infrastructure/firebase/config"; 

export default function useProtection() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/sign-in");
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  return  loading ;
}
