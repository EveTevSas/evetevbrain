import type { CommunityPerson } from "@/lib/contracts";

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phonePattern = /\+?[0-9][0-9 ()-]{6,}[0-9]/;

export interface CommunityContactChannels {
  email: string;
  phone: string;
  hasEmail: boolean;
  hasPhone: boolean;
}

export function communityContactChannels(person: CommunityPerson): CommunityContactChannels {
  const email = person.email?.trim() || person.contact.match(emailPattern)?.[0] || "";
  const contactWithoutEmail = email ? person.contact.replace(email, " ") : person.contact;
  const phone = person.phone?.trim() || contactWithoutEmail.match(phonePattern)?.[0]?.trim() || "";

  return {
    email,
    phone,
    hasEmail: emailPattern.test(email),
    hasPhone: phone.replace(/\D/g, "").length >= 7
  };
}
