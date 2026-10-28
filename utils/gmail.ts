import { expect } from "@playwright/test";
import type { Box } from "imap";
import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import { env } from "./env";

function imapConfig() {
    return {
        imap: {
            user: env.gmailUser,
            password: env.gmailAppPassword,
            host: "imap.gmail.com",
            port: 993,
            tls: true,
            authTimeout: 10_000,
            tlsOptions: { rejectUnauthorized: false },
        },
    };
}

export async function verifyGmailConnection(): Promise<void> {
    let connection: imaps.ImapSimple | undefined;
    try {
        connection = await imaps.connect(imapConfig());
        await connection.openBox("INBOX");
    } catch (error) {
        throw new Error(
            `Unable to access Gmail IMAP. Check GMAIL_USER and GMAIL_APP_PASSWORD: ${error instanceof Error ? error.message : String(error)}`
        );
    } finally {
        connection?.end();
    }
}

/**
 * UID the next incoming message will get. Take it before triggering an email and pass it to the
 * fetch helpers so an older OTP / reset email to the same address is never picked up.
 */
export async function inboxPosition(): Promise<number> {
    const connection = await imaps.connect(imapConfig());
    try {
        const box = (await connection.openBox("INBOX")) as unknown as Box;
        return box.uidnext;
    } finally {
        connection.end();
    }
}

async function findLatestMatch(recipient: string, fromUid: number, pattern: RegExp): Promise<string | null> {
    const connection = await imaps.connect(imapConfig());
    try {
        await connection.openBox("INBOX");
        const messages = await connection.search([["UID", `${fromUid}:*`], ["TO", recipient]], {
            bodies: [""],
            markSeen: false,
        });
        // "n:*" always includes the newest message even when its UID is below n, so filter explicitly.
        const newMessages = messages
            .filter((message) => message.attributes.uid >= fromUid)
            .sort((a, b) => b.attributes.uid - a.attributes.uid);

        for (const message of newMessages) {
            const raw = message.parts.find((part) => part.which === "");
            if (!raw) continue;
            const parsed = await simpleParser(raw.body);
            const match = `${parsed.text ?? ""} ${parsed.html || ""}`.match(pattern);
            if (match) return match[1];
        }
        return null;
    } finally {
        connection.end();
    }
}

async function waitForEmailValue(recipient: string, fromUid: number, pattern: RegExp, what: string): Promise<string> {
    let value: string | null = null;
    await expect
        .poll(
            async () => {
                value = await findLatestMatch(recipient, fromUid, pattern).catch(() => null);
                return value;
            },
            { message: `Waiting for ${what} email to ${recipient}`, timeout: 90_000, intervals: [2_000, 3_000, 5_000] }
        )
        .not.toBeNull();
    return value!;
}

export function fetchLoginOtp(recipient: string, fromUid: number): Promise<string> {
    return waitForEmailValue(recipient, fromUid, /\(OTP\)[^\d]{0,60}(\d{4})\b/i, "login OTP");
}

export function fetchPasswordResetLink(recipient: string, fromUid: number): Promise<string> {
    return waitForEmailValue(recipient, fromUid, /(https?:\/\/\S+\/reset-password\?token=[A-Za-z0-9]+)/, "password reset");
}
