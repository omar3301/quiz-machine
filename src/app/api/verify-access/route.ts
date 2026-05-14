import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  const correctCode = process.env.ACCESS_CODE ?? "quizforge2025";

  if (code === correctCode) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}
