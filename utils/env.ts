import * as dotenv from "dotenv";

dotenv.config({ quiet: true });

function required(name: string, value: string | undefined): string {
    if (!value) {
        throw new Error(`Set ${name} in the ignored .env file (see .env.example).`);
    }
    return value;
}

export const env = {
    baseUrl: process.env.BASE_URL ?? "https://dmoneyportal.roadtocareer.net",
    adminEmail: process.env.ADMIN_EMAIL ?? "admin@dmoney.com",
    adminPassword: process.env.ADMIN_PASSWORD ?? "1234",
    systemEmail: process.env.SYSTEM_EMAIL ?? "system@dmoney.com",
    systemPassword: process.env.SYSTEM_PASSWORD ?? "1234",
    get gmailUser(): string {
        return required("GMAIL_USER", process.env.GMAIL_USER?.trim());
    },
    get gmailAppPassword(): string {
        return required("GMAIL_APP_PASSWORD", process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, ""));
    },
};
