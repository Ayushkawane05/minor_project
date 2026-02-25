import crypto from "crypto";

export const generateId = (prefix) => {
    return `${prefix}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
};
