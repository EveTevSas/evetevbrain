"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getApiKey } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace(getApiKey() ? "/dashboard" : "/login");
  }, [router]);
  return null;
}
