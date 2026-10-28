import { env } from "./env";

export type Role = "Customer" | "Agent";

export interface TestUser {
    role: Role;
    name: string;
    email: string;
    password: string;
    phone: string;
    nid: string;
}

export const AMOUNTS = {
    adminToSystem: 2000,
    systemToAgent: 2000,
    cashIn: 500,
    // Agents earn this commission on every customer Cash In.
    cashInCommissionRate: 0.025,
};

export const NEW_AGENT_PASSWORD = "5678";

function randomDigits(length: number): string {
    return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

/** Builds a +tag alias of GMAIL_USER so OTP and reset emails land in the inbox the tests read. */
function gmailAlias(tag: string): string {
    const [localPart, domain] = env.gmailUser.split("@");
    return `${localPart.split("+")[0]}+${tag}@${domain}`;
}

export function createUser(role: Role): TestUser {
    const suffix = `${Date.now().toString().slice(-6)}${randomDigits(3)}`;
    return {
        role,
        name: `${role} ${suffix}`,
        email: gmailAlias(`${role.toLowerCase()}${suffix}`),
        password: "1234",
        phone: `01${role === "Agent" ? "7" : "8"}${randomDigits(8)}`,
        nid: `19${randomDigits(8)}`,
    };
}

export function money(amount: number): string {
    return amount.toFixed(2);
}
