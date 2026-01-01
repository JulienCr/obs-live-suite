import { redirect } from "next/navigation";

/**
 * Root page - redirects to dashboard
 */
export default function HomePage() {
  redirect("/dashboard");
}
