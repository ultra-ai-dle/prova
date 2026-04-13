import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { message, replyEmail, code, stdin, includeCode } = await req.json();

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 });
  }

  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!toEmail || !fromEmail || !smtpHost || !smtpUser || !smtpPass) {
    return NextResponse.json({ error: "서버 이메일 설정이 없습니다." }, { status: 500 });
  }

  const subject = `[Prova 문의] ${message.trim().split("\n")[0].slice(0, 60)}`;

  const bodyParts: string[] = [
    "=== 문의 내용 ===",
    message.trim(),
  ];

  if (typeof replyEmail === "string" && replyEmail.trim().length > 0) {
    bodyParts.push("\n=== 회신 이메일 ===");
    bodyParts.push(replyEmail.trim());
  }

  if (includeCode && typeof code === "string" && code.trim().length > 0) {
    bodyParts.push("\n=== 첨부 코드 ===");
    bodyParts.push(code.trim());

    if (typeof stdin === "string" && stdin.trim().length > 0) {
      bodyParts.push("\n=== 입력값 (stdin) ===");
      bodyParts.push(stdin.trim());
    }
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const hasReplyEmail = typeof replyEmail === "string" && replyEmail.trim().length > 0;

  await transporter.sendMail({
    from: `"Prova 문의" <${fromEmail}>`,
    to: toEmail,
    ...(hasReplyEmail && { replyTo: replyEmail.trim() }),
    subject,
    text: bodyParts.join("\n\n"),
  });

  return NextResponse.json({ ok: true });
}
