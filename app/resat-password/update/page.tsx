"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          if (session?.user) {
            console.log("현재 사용� 이메일:", session.user.email);
            setMessage(
              "비밀번호 재설정 모드입니다. 새 비밀번호를 입력해주세요."
            );
          } else {
            setMessage("유효하지 않은 비밀번호 재설정 링크입니다.");
            setTimeout(() => router.push("/login"), 2000);
          }
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setMessage("비밀번호가 성공적으로 변경되었습니다.");
      setTimeout(() => router.push("/login"), 2000); // 2초 후 로그인 페이지로 이동
    } catch (error) {
      setMessage("오류가 발생했습니다. 다시 시도해주세요.");
      console.error("Error: ", error);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>새 비밀번호 설정</CardTitle>
          <CardDescription>새로운 비밀번호를 입력해주세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Input
                  type="password"
                  placeholder="새 비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <Button className="w-full" onClick={handleUpdatePassword}>
            비밀번호 변경
          </Button>
          {message && <p className="mt-4 text-center text-sm">{message}</p>}
        </CardFooter>
      </Card>
    </div>
  );
}
