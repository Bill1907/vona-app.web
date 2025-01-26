import Link from "next/link";

export default function Home() {
  return (
    <div>
      <h1>Hello World</h1>
      <Link href="/resat-password/request">비밀번호 재설정 요청</Link>
      <Link href="/resat-password/update">비밀번호 재설정</Link>
    </div>
  );
}
