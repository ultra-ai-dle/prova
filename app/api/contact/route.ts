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

  const trimmedReplyEmail =
    typeof replyEmail === "string" ? replyEmail.trim() : "";

  const bodyParts: string[] = ["=== 문의 내용 ===", message.trim()];

  if (trimmedReplyEmail.length > 0) {
    bodyParts.push("\n=== 회신 이메일 ===");
    bodyParts.push(trimmedReplyEmail);
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

  try {
    await transporter.sendMail({
      from: `"Prova 문의" <${fromEmail}>`,
      to: toEmail,
      ...(trimmedReplyEmail.length > 0 && { replyTo: trimmedReplyEmail }),
      subject,
      text: bodyParts.join("\n\n"),
    });
  } catch {
    return NextResponse.json(
      { error: "이메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
