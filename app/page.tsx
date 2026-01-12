import { WalletBalances } from "@/components/WalletBalances";
import { WelcomeModal } from "@/components/WelcomeModal";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <WelcomeModal />
      <main className="py-8">
        <WalletBalances />
      </main>
    </div>
  );
}
