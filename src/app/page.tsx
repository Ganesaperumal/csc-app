import { redirect } from 'next/navigation';

export default function Home() {
  // Simple redirect to dashboard for now
  // Real implementation would check auth state
  redirect('/dashboard');
}
